/*
  model-test.js

  This file is optional, but is strongly recommended. It tests the `getData` function to ensure its translating
  correctly.
*/

const test = require('tape')
const dailyTimeSeriesFixture = require('./fixtures/daily-time-series')
const manyMetricsManyDimensFixture = require('./fixtures/many-metrics-many-dimens')
const sumFixture = require('./fixtures/sum')
const proxyquire = require('proxyquire')
const _ = require('lodash')

// Stub out the googleapis dependency
const googleapisStub = {
  google: {
    analyticsreporting: function () {
      return {
        reports: {
          // The main get data from Google function
          batchGet: function (params) {
            // Needs to return a promise
            return new Promise((resolve, reject) => {
              setTimeout(() => {
                // Return different mock responses based on the params that were submitted
                const dimensions = params.resource.reportRequests[0].dimensions
                const metrics = params.resource.reportRequests[0].metrics
                if (dimensions.length === 0) {
                  let data = _.cloneDeep(sumFixture)
                  return resolve(data)
                } else if (metrics[0].expression === 'ga:pageviews' && dimensions[0].name === 'ga:date') {
                  let data = _.cloneDeep(dailyTimeSeriesFixture)
                  return resolve(data)
                } else {
                  let data = _.cloneDeep(manyMetricsManyDimensFixture)
                  return resolve(data)
                }
              }, 0)
            })
          }
        }
      }
    },
    // JWT function
    auth: {JWT: function () { return '' }}
  }
}
const Model = proxyquire('../src/model', { 'googleapis': googleapisStub })
const model = new Model()

test('should properly translate features from Google Analystics API response to GeoJSON - 30 day time-series', t => {
  t.plan(11)
  model.getData({params: {host: 'views', id: 'day'}, query: {time: '2018-06-20,2018-07-20'}}, (err, geojson) => {
    t.equal(err, null)
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
  model.getData({params: {host: 'views', id: 'none'}, query: {time: '2018-06-20,2018-07-20'}}, (err, geojson) => {
    t.equal(err, null)
    t.equal(geojson.features[0].properties.views, 27179)
  })
})

test('should properly handle and translate concatenated metrics and dimension parameters', t => {
  t.plan(7)
  model.getData({ params: { host: 'sessions::views', id: 'country::month', method: 'query' }, query: {} }, (err, geojson) => {
    t.equal(err, null)
    t.equal(geojson.metadata.geometryType, 'MultiPolygon')
    t.equal(geojson.features[3].properties.country, 'Albania')
    t.equal(RegExp(/^\d\d\d\d-\d\d-\d\dT\d\d:\d\d:\d\d.\d\d\d-\d\d\d\d/).test(geojson.features[3].properties.timestamp), true)
    t.equal(geojson.features[3].properties.sessions, 23)
    t.equal(geojson.features[3].properties.views, 98)
    t.ok(geojson.features[3].geometry)
  })
})

test('should properly modify outFields parameter when a where clause with extra dimensions is added', t => {
  t.plan(2)
  const req = {params: {host: 'sessions::views', id: 'month'}, query: { where: `country='Canada'` }}
  model.getData(req, (err, geojson) => {
    t.equal(err, null)
    t.equal(req.query.outFields, 'sessions,views,month,timestamp,OBJECTID')
  })
})

test('should reject with 400 error do to bad request parameters', t => {
  t.plan(4)
  model.getData({params: {host: 'bad-param', id: 'day'}, query: {}}, (err, geojson) => {
    t.ok(err)
    t.equal(err.code, 400)
  })
  model.getData({params: {host: 'views', id: 'bad-param'}, query: {}}, (err, geojson) => {
    t.ok(err)
    t.equal(err.code, 400)
  })
})
