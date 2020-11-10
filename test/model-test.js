/*
  model-test.js

  This file is optional, but is strongly recommended. It tests the `getData` function to ensure its translating
  correctly.
*/

const test = require('tape')
const dailyTimeSeriesFixture = require('./fixtures/daily-time-series')
const manyMetricsManyDimensFixture = require('./fixtures/many-metrics-many-dimens')
const sumFixture = require('./fixtures/sum')
const multiDimensionFixture = require('./fixtures/multi-dimension')
const proxyquire = require('proxyquire')

test('should properly translate features from Google Analystics API response to GeoJSON - 30 day time-series', t => {
  t.plan(11)
  const Model = proxyquire('../src/model', { googleapis: getGoogleApiMock(dailyTimeSeriesFixture) })
  const model = new Model()
  model.getData({ params: { id: 'views:day' }, query: { time: '2018-06-20,2018-07-20' } }, (err, geojson) => {
    t.notOk(err)
    t.equal(geojson.type, 'FeatureCollection')
    t.ok(geojson.features)
    t.ok(geojson.metadata)
    t.ok(geojson.metadata.title)
    t.ok(geojson.metadata.description)
    t.equal(geojson.features[0].type, 'Feature')
    t.equal(geojson.features[0].geometry, null)
    t.ok(geojson.features[0].properties)
    t.equal(RegExp(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\d-\d\d\d\d/).test(geojson.features[0].properties.timestamp), true)
    t.equal(Number.isInteger(geojson.features[0].properties.views), true)
  })
})

test('should properly translate features from Google Analystics API response to GeoJSON - 30 day sum', t => {
  t.plan(2)
  const Model = proxyquire('../src/model', { googleapis: getGoogleApiMock(sumFixture) })
  const model = new Model()
  model.getData({ params: { id: 'views' }, query: { time: '2018-06-20,2018-07-20' } }, (err, geojson) => {
    t.equal(err, null)
    t.equal(geojson.features[0].properties.views, 27179)
  })
})

test('should properly handle and translate concatenated metrics and dimension parameters', t => {
  t.plan(5)
  const Model = proxyquire('../src/model', { googleapis: getGoogleApiMock(manyMetricsManyDimensFixture) })
  const model = new Model()
  model.getData({ params: { id: 'sessions,views:country,month', method: 'query' }, query: {} }, (err, geojson) => {
    t.equal(err, null)
    t.equal(geojson.features[3].properties.country, 'Albania')
    t.equal(RegExp(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\d-\d\d\d\d/).test(geojson.features[3].properties.timestamp), true)
    t.equal(geojson.features[3].properties.sessions, 23)
    t.equal(geojson.features[3].properties.views, 98)
  })
})

test('should properly modify outFields parameter when a where clause with extra dimensions is added', t => {
  t.plan(2)
  const Model = proxyquire('../src/model', { googleapis: getGoogleApiMock(manyMetricsManyDimensFixture) })
  const model = new Model()
  const req = { params: { id: 'sessions,views:month' }, query: { where: 'country=\'Canada\'' } }
  model.getData(req, (err, geojson) => {
    t.equal(err, null)
    t.equal(req.query.outFields, 'sessions,views,month,timestamp,OBJECTID')
  })
})

test('should properly backfill features from Google Analystics API response', t => {
  t.plan(2)
  const Model = proxyquire('../src/model', {
    googleapis: getGoogleApiMock(multiDimensionFixture),
    config: {
      goog: {
        backfillTimeseries: true,
        analyticsTimezone: 'America/New_York'
      }
    }
  })
  const model = new Model()
  model.getData({ params: { id: 'views:day,eventCategory' }, query: { time: '2020-03-20,2020-04-20' } }, (err, geojson) => {
    t.notOk(err)
    t.equals(geojson.features.length, 35)
  })
})

test('should reject with 400 error do to bad request parameters', t => {
  t.plan(4)
  const Model = proxyquire('../src/model', { googleapis: getGoogleApiMock(dailyTimeSeriesFixture) })
  const model = new Model()
  model.getData({ params: { id: 'bad-param:day' }, query: {} }, (err, geojson) => {
    t.ok(err)
    t.equal(err.code, 400)
  })
  model.getData({ params: { host: 'views', id: 'bad-param' }, query: {} }, (err, geojson) => {
    t.ok(err)
    t.equal(err.code, 400)
  })
})

function getGoogleApiMock (data) {
  return {
    google: {
      analyticsreporting: function () {
        return {
          reports: {
            // The main get data from Google function
            batchGet: async function (params) {
              // Needs to return a promise
              return Promise.resolve(data)
            }
          }
        }
      },
      // JWT function
      auth: { JWT: function () { return '' } }
    }
  }
}
