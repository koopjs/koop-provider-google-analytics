const _ = require('lodash')
const Moment = require('moment')
const MomentRange = require('moment-range')
const moment = MomentRange.extendMoment(Moment)
const { timeDimensionToTimestamp } = require('./validation/time')

function backfillTimeseriesFeatures ({ startDate, endDate, interval, timezone, geojson }) {
  const features = _.chain(geojson.features).cloneDeep().value()
  const range = timeSeriesRange({ startDate, endDate, interval, timezone })
  const missingTimestamps = _.differenceWith(range, features, (backfill, feature) => {
    return backfill.properties.timestamp === feature.properties.timestamp
  })
  return _.chain(features).concat(missingTimestamps).orderBy('properties.timestamp').value()
}

function timeSeriesRange ({ startDate, endDate, interval, timezone }) {
  const range = moment.range(startDate, endDate)
  return Array.from(range.by(interval)).map(date => {
    return {
      type: 'Feature',
      properties: { timestamp: timeDimensionToTimestamp(interval, date, timezone) },
      geometry: null
    }
  })
}

module.exports = backfillTimeseriesFeatures
