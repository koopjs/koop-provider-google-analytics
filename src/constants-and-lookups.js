const _ = require('lodash')
const config = require('config')
const customNonTimeDimensions = _.get(config, `goog.dimensions`) || {}
const customMetrics = _.get(config, `goog.metrics`) || {}

const googleTimeDimensions = {
  'ga:dateHour': 'hour',
  'ga:date': 'day',
  'ga:yearWeek': 'week',
  'ga:yearMonth': 'month'
}

const googleDimensions = Object.assign({
  'ga:eventCategory': 'eventCategory',
  'ga:eventAction': 'eventAction',
  'ga:eventLabel': 'eventLabel',
  'ga:country': 'country',
  'ga:countryIsoCode': 'countryIsoCode'
}, customNonTimeDimensions)

const googleMetrics = Object.assign({
  'ga:pageviews': 'views',
  'ga:uniquePageviews': 'uniqueViews',
  'ga:totalEvents': 'totalEvents',
  'ga:sessions': 'sessions'
}, customMetrics)

const sqlToMetricOperators = {
  '=': 'EQUAL',
  '<': 'LESS_THAN',
  '>': 'GREATER_THAN'
}
// A lookup to convert incoming request parameters to Google Analytics analogs
const googleParamToProvider = Object.freeze(Object.assign({}, googleTimeDimensions, googleDimensions, googleMetrics))

// A lookup to convert Google Analytics parameter names to GeoJSON property names
const providerParamToGoogle = _.invert(googleParamToProvider)

const TIME_DIMENSIONS = Object.freeze(_.values(googleTimeDimensions))
const DIMENSIONS = Object.freeze(_.values(googleDimensions).concat(TIME_DIMENSIONS).concat('none'))
const METRICS = Object.freeze(_.values(googleMetrics))
const METRICS_OPERATORS = Object.freeze(Object.keys(sqlToMetricOperators))

module.exports = { googleParamToProvider, providerParamToGoogle, sqlToMetricOperators, TIME_DIMENSIONS, DIMENSIONS, METRICS, METRICS_OPERATORS }
