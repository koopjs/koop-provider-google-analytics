const { google } = require('googleapis')
const analytics = google.analyticsreporting({ version: 'v4' })
const hash = require('object-hash')
const {
  goog: {
    analyticsTimezone,
    privateKey,
    clientEmail,
    viewId,
    backfillTimeseries
  } = {},
  analyticsCache: {
    ttl
  } = {}
} = require('config')
const { CodedError } = require('./error')
const { TIME_DIMENSIONS, providerParamToGoogle, googleParamToProvider } = require('./constants-and-lookups')
const validateParams = require('./validation')
const backfillTimeseriesFeatures = require('./backfill-timeseries-features')
const { timeDimensionToTimestamp } = require('./validation/time')
const { transformDimensionPredicate, transformMetricPredicate } = require('./transform')
const scopes = 'https://www.googleapis.com/auth/analytics.readonly'
const MAX_RECORD_COUNT = 10000
const googAnalyticsTimezone = process.env.GOOGLE_ANALYTICS_TIMEZONE || analyticsTimezone
const googPrivateKey = (process.env.GOOGLE_PRIVATE_KEY) ? Buffer.from(process.env.GOOGLE_PRIVATE_KEY, 'base64').toString() : Buffer.from(privateKey, 'base64').toString()
const googClientEmail = process.env.GOOGLE_CLIENT_EMAIL || clientEmail
const googViewId = process.env.GOOGLE_VIEW_ID || viewId
const cacheTtl = process.env.ANALYTICS_CACHE_TTL || ttl

/**
 * Define the provider Model
 */
function Model () {}

Model.prototype.getData = function (req, callback) {
  if (!googViewId || !googAnalyticsTimezone || !googPrivateKey || !googClientEmail) return callback(new CodedError('Environment variables required for accessing Google Analytics are missing.', 500))

  const { error, value: params } = validateParams(req)

  if (error) return callback(error)

  // Leverage outFields to maintain desired set of output attributes
  req.query.outFields = [].concat(params.outFields, ['OBJECTID']).join(',')

  // Query google analytics
  analytics.reports.batchGet(prepareRequestBody(params))
    .then(result => {
      // If a full set of results where unable to be returned, reject the request, otherwise the time series will be incomplete or the statistics will be wrong
      if (result.data.reports[0].data.rowCount && result.data.reports[0].data.rowCount > result.data.reports[0].data.rows.length) return callback(new CodedError('Request exceeds maximum page-size from Google Analytics.  Reduce time-range or alter dimension.', 400))

      const analyticsMetadata = result.data.reports[0].columnHeader
      const analyticsData = result.data.reports[0].data.rows || []
      const geojson = translate(analyticsMetadata, analyticsData)

      // Cache data if configured to do so.
      if (cacheTtl) {
        geojson.ttl = cacheTtl
      }

      geojson.metadata = {
        name: `${params.metric.join(', ')} by ${params.dimension.join(', ')}`,
        title: `${params.metric.join(', ')} by ${params.dimension.join(', ')}`,
        description: 'This provider converts Koop request parameters to parameters required by Google Analytics, and translates the response to GeoJSON for use in Koop output services',
        maxRecordCount: MAX_RECORD_COUNT
      }

      if (req.query.where) geojson.filtersApplied = { where: true }

      if (shouldBackfill(params.dimension)) {
        geojson.features = backfillTimeseriesFeatures({
          startDate: params.time.startDate,
          endDate: params.time.endDate,
          interval: getTimeDimension(params.dimension),
          timezone: analyticsTimezone,
          geojson
        })
      }
      // Hand off the data to Koop
      callback(null, geojson)
    })
    .catch(err => {
      callback(err)
    })
}

/**
 * Create a cache key with request parameters.  Overrides createKey defined in koop-core
 * @param {*} req
 */
Model.prototype.createKey = function (req) {
  const validatedParams = validateParams(req)
  if (!validatedParams.error) {
    return `${req.url.split('/')[1]}::${hash(validatedParams.value)}`
  }

  let key = req.url.split('/')[1]
  if (req.params.id) key = `${key}::${req.params.id}`
  return key
}

/**
 * Create the request body to send to Google Analytics V4
 * @param {object} params
 * @param {string[]} params.dimension array of dimension strings
 * @param {string[]} params.metric array of metric strings
 * @param {object[]} params.where.dimensionFilters collection of dimension filter objects
 * @param {object[]} params.where.metricFilters collection of dimension metric objects
 * @param {string} params.time.startDate YYYY-MM-DD formated date string for start of date range
 * @param {string} params.time.endDate YYYY-MM-DD formated date string for end of date range
 * @returns {object} Google Analytics request body
 */
function prepareRequestBody (params) {
  // Get a json web token for authentication
  const jwt = new google.auth.JWT(googClientEmail, null, googPrivateKey, scopes)

  // Create the google analytics request parameters
  return {
    auth: jwt,
    resource: {
      reportRequests: [{
        viewId: `ga:${googViewId}`,
        pageSize: MAX_RECORD_COUNT,
        dateRanges: [{ startDate: params.time.startDate, endDate: params.time.endDate }],
        metrics: params.metric.map(m => { return { expression: providerParamToGoogle[m] } }),
        dimensions: params.dimension.map(d => { return { name: providerParamToGoogle[d] } }),
        metricFilterClauses: [{ operator: params.where.metricFilters.operator, filters: params.where.metricFilters.filters.map(transformMetricPredicate) }],
        dimensionFilterClauses: [{ operator: params.where.dimensionFilters.operator, filters: params.where.dimensionFilters.filters.map(transformDimensionPredicate) }],
        includeEmptyRows: true
      }]
    }
  }
}

/**
 * Convert a Google Analytics Reporting (v4) response to a GeoJSON Feature Collection representing a time series
 * @param {object} metadata - column header object from a Google Analytics "report"
 * @param {array} data - data row object array from a Google Analytics "report"
 * @returns {object} GeoJSON feature collection
 */
function translate (metadata, data) {
  // Convert GA dimension names back to our more abstract versions
  const dimensions = metadata.dimensions || []
  const dimensionMetadata = dimensions.map(dimension => {
    return googleParamToProvider[dimension] || dimension
  })

  // Convert GA specifc metric names back to our more abstract versions
  const metricsMetadata = metadata.metricHeader.metricHeaderEntries.map((header) => {
    header.name = googleParamToProvider[header.name]
    return header
  })

  // Map data rows to geojson features
  const features = data.map(row => { return formatFeature(row, { dimensions: dimensionMetadata, metrics: metricsMetadata }) })

  // Return the GeoJSON feature collection
  return {
    type: 'FeatureCollection',
    features
  }
}

function formatFeature (input, metadata) {
  const properties = {}
  const dimensions = input.dimensions || []

  // Loop thru dimensions and convert values to GeoJSON properties
  dimensions.forEach((dimension, i) => {
    // If this is the time/interval dimension, give it property name "timestamp"
    if (TIME_DIMENSIONS.includes(metadata.dimensions[i])) properties.timestamp = timeDimensionToTimestamp(metadata.dimensions[i], dimension, googAnalyticsTimezone)
    else properties[metadata.dimensions[i]] = dimension
  })

  // Loop thru metrics and assign value to GeoJSON properties
  input.metrics[0].values.forEach((metric, i) => {
    // If the the index of this metric is found in numericMetricIndices, convert any numeric metrics to numbers
    properties[metadata.metrics[i].name] = (metadata.metrics[i].type === 'INTEGER') ? Number(metric) : metric
  })

  return {
    type: 'Feature',
    properties,
    geometry: null
  }
}

function shouldBackfill (dimensions) {
  return backfillTimeseries && dimensions.length > 1 && getTimeDimension(dimensions)
}

function getTimeDimension (dimensions) {
  return dimensions.find(d => { return TIME_DIMENSIONS.includes(d) })
}
module.exports = Model
