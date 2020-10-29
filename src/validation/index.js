const Joi = require('joi')
const _ = require('lodash')
const moment = require('moment')
const config = require('config')
const { whereDecomposer } = require('./where')
const { CodedError } = require('../error')
const { DIMENSIONS, TIME_DIMENSIONS, METRICS } = require('../constants-and-lookups')
const dateRangeStart = process.env.GOOGLE_START_DATE || _.get(config, 'goog.startDate') || '2005-01-01'

/**
 * Extend Joi type for coercing :: delimited strings to arrays. Includes 'dimension' rule for handling 'none' values
 * @param {*} joi
 */
function doubleColonDelimited (joi) {
  return {
    base: joi.array(),
    name: 'doubleColonDelimited',
    coerce: (value, state, options) => (value.split ? value.split('::') : value),
    rules: [{
      name: 'dimensions',
      validate (params, value, state, options) {
        if (value.includes('none') && value.length === 1) return [] // Return empty array if only value is 'none'
        else if (value.includes('none')) return value.filter(d => d !== 'none') // Strip "none" if other values found
        else return value
      }
    }]
  }
}

/**
 * Extend Joi type for coercing "where" string to a formatted object
 * @param {*} joi
 */
function where (joi) {
  return {
    base: joi.object(),
    name: 'where',
    coerce (value, state, options) {
      if (!value) return

      // Remove 1=1 variations
      const whereStr = value.replace(/(\(*1\s*=\s*1\)*)\s*(AND|OR)/g, '').replace(/(AND|OR)\s*(\(*1\s*=\s*1\)*)/g, '').replace(/(\(*1\s*=\s*1\)*)/g, '')

      // If, after removing 1=1, the where is empty, return
      if (whereStr.trim().length === 0) return

      // Decompose it into an array of predicates
      const where = whereDecomposer(whereStr)

      // Return errors, if any
      if (where.error) return this.createError(where.error.message, { v: value }, state, options)

      return where
    }
  }
}

/**
 * Extend Joi type for coercing "time" string to a formatted object
 * @param {*} joi
 */
function timeArray (joi) {
  return {
    base: joi.object(),
    name: 'timeArray',
    coerce (value, state, options) {
      let startDate
      let endDate

      if (!value) return

      // Remove any whitespace and split by comma
      const timerange = value.replace(/\s/g, '').split(',')

      // Validate a two element array with either null, a timestamp, or a YYYY-MM-DD string
      if (timerange.length !== 2 || timerange.some(time => {
        if (time !== 'null' && !moment(Number(time)).isValid() && !moment(time, 'YYYY-MM-DD').isValid()) return true
      })) return this.createError('"time" param must be a comma delimited string: "<start>,<end>". Use "null", a YYY-MM-DD string, or a unix timestamp', { v: value }, state, options)

      // Handle nulls
      if (timerange[0] === 'null') startDate = dateRangeStart
      else if (moment(Number(timerange[0])).isValid()) startDate = moment(Number(timerange[0])).format('YYYY-MM-DD')
      else startDate = timerange[0]
      if (timerange[1] === 'null') endDate = moment().format('YYYY-MM-DD')
      else if (moment(Number(timerange[1])).isValid()) endDate = moment(Number(timerange[1])).format('YYYY-MM-DD')
      else endDate = timerange[1]

      return { startDate, endDate }
    }
  }
}

/**
 * Extend Joi type for coercing "outFields" to an array.
 * @param {*} joi
 */
function outFields (joi) {
  return {
    base: joi.array(),
    name: 'outFields',
    coerce (value, state, options) {
      if (!value) return
      if (typeof value !== 'string') return this.createError('"outFields" param should be a string', { v: value }, state, options)
      if (value === '*') return []
      return value.split(',')
    }
  }
}

// Extend Joi for special types
const customJoi = Joi.extend(doubleColonDelimited).extend(where).extend(outFields).extend(timeArray)

// Create a validation and default value schema for incoming request parameters
const paramsSchema = Joi.object().keys({
  dimension: customJoi.array().items(DIMENSIONS).single().error(new CodedError('Invalid "dimensions" parameter', 400)),
  metric: customJoi.array().items(METRICS).single().error(new CodedError(`"metric" parameter must be one of: ${METRICS.join(', ')}`, 400)),
  where: customJoi.where().default({ metricFilters: { filters: [] }, dimensionFilters: { filters: [] } }).error((errors) => { return new CodedError(errors[0].message || errors[0].type, 400) }),
  outFields: customJoi.outFields().default([]).error((errors) => { return new CodedError(errors[0].message || errors[0].type, 400) }),
  time: customJoi.timeArray().default(function () { return { startDate: dateRangeStart, endDate: moment().format('YYYY-MM-DD') } }, 'time')
}).unknown()

function validateParams (req) {
  const { query: queryParams, params: { id } } = req

  const pathParams = parseIdParam(id)

  const { error, value } = Joi.validate({ ...queryParams, ...pathParams }, paramsSchema)

  if (error) return { error }

  value.outFields = prepOutFieldsForWinnow(value.outFields, [].concat(value.metric, value.dimension))

  return { value }
}

function parseIdParam (id) {
  const idRegex = /^(?<delimitedMetrics>[^:]+)(:)?((?<delimitedDimensions>[^~]+)(~?)(?<delimitedOptions>.+)?)?$/
  const { groups: { delimitedMetrics, delimitedDimensions, delimitedOptions } } = idRegex.exec(id)
  const metric = delimitedMetrics ? delimitedMetrics.split(',') : []
  const dimension = delimitedDimensions ? delimitedDimensions.split(',') : []
  const options = delimitedOptions ? parseOptions(delimitedOptions) : undefined
  return { metric, dimension, options }
}

function parseOptions (delimitedOptions) {
  return _.chain(delimitedOptions)
    .split(',')
    .map(key => { return [key, true] })
    .fromPairs()
    .value()
}

/**
 * Winnow will fine-tune the filtered results. To do this we need to request dimensions and metrics found in the where clause filter, so that
 * they are in the GeoJSON for Winnow to operate on.  However, we also need ensure that these extra fields are NOT in the resulting feature properties.
 * We can do this by leveraging the outFields parameter used by Winnow to limit fields
 * @param {string[]} outFields the outFields array, parse from the query string parameter
 * @param {string[]} metricsAndDimensions array of request metrics and dimensions sent as route params in request
 */
function prepOutFieldsForWinnow (outFields, metricsAndDimensions) {
  // If outFields already exist, use as-is
  if (outFields.length > 0) return outFields

  // Assign originally requested metrics and dimensions as new outFields. Add timestamp for requests that include a time-dimension
  if (_.intersection(metricsAndDimensions, TIME_DIMENSIONS).length > 0) return metricsAndDimensions.concat(['timestamp'])
  return metricsAndDimensions
}

module.exports = validateParams
