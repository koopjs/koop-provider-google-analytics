const test = require('tape')
const backfillTimeseriesFeatures = require('../src/backfill-timeseries-features')

test('backfillTimeseriesFeatures - by day', spec => {
  spec.plan(3)
  const startDate = '2020-01-01'
  const endDate = '2020-01-31'
  const interval = 'day'
  const timezone = 'America/New_York'
  const geojson = {
    features: [
      {
        properties: {
          timestamp: '2020-01-23T23:59:59.999-0400'
        }
      }
    ]
  }
  const backfilled = backfillTimeseriesFeatures({ startDate, endDate, interval, timezone, geojson })
  spec.equals(backfilled.length, 32)
  spec.isEquivalent(backfilled[0], { type: 'Feature', properties: { timestamp: '2020-01-01T23:59:59.999-0500' }, geometry: null })
  spec.isEquivalent(backfilled[31], { type: 'Feature', properties: { timestamp: '2020-01-31T23:59:59.999-0500' }, geometry: null })
})

test('backfillTimeseriesFeatures - by hour', spec => {
  spec.plan(3)
  const startDate = '2020-01-01'
  const endDate = '2020-01-31'
  const interval = 'hour'
  const timezone = 'America/New_York'
  const geojson = {
    features: [
      {
        properties: {
          timestamp: '2020-01-23T23:59:59.999-0400'
        }
      }
    ]
  }
  const backfilled = backfillTimeseriesFeatures({ startDate, endDate, interval, timezone, geojson })
  spec.equals(backfilled.length, 722)
  spec.isEquivalent(backfilled[0], { type: 'Feature', properties: { timestamp: '2020-01-01T00:59:59.999-0500' }, geometry: null })
  spec.isEquivalent(backfilled[721], { type: 'Feature', properties: { timestamp: '2020-01-31T00:59:59.999-0500' }, geometry: null })
})

test('backfillTimeseriesFeatures - by hour', spec => {
  spec.plan(3)
  const startDate = '2020-01-01'
  const endDate = '2020-01-31'
  const interval = 'month'
  const timezone = 'America/New_York'
  const geojson = {
    features: [
      {
        properties: {
          timestamp: '2020-01-23T23:59:59.999-0400'
        }
      }
    ]
  }
  const backfilled = backfillTimeseriesFeatures({ startDate, endDate, interval, timezone, geojson })
  spec.equals(backfilled.length, 2)
  spec.isEquivalent(backfilled[0], { properties: { timestamp: '2020-01-23T23:59:59.999-0400' } })
  spec.isEquivalent(backfilled[1], { type: 'Feature', properties: { timestamp: '2020-01-31T23:59:59.999-0500' }, geometry: null })
})
