const test = require('tape')
const _ = require('lodash')
const validateParams = require('../src/validation/param-validation')

test('validateParams - simple metric and dimension params', function (t) {
  const req = { params: { id: 'views:country' }, query: {} }
  const result = validateParams(req)
  t.plan(5)
  t.equals(result.error, undefined)
  t.equals(result.value.metric[0], 'views')
  t.equals(result.value.dimension[0], 'country')
  t.equals(RegExp(/^\d\d\d\d-\d\d-\d\d/).test(result.value.time.startDate), true)
  t.equals(RegExp(/^\d\d\d\d-\d\d-\d\d/).test(result.value.time.endDate), true)
})

test('validateParams - time params, unix', function (t) {
  const req = { params: { id: 'views:country' }, query: { time: '0,' + 86400000 } }
  const result = validateParams(req)
  t.plan(6)
  t.equals(result.error, undefined)
  t.equals(result.value.metric[0], 'views')
  t.equals(result.value.dimension[0], 'country')
  t.equals(RegExp(/^\d\d\d\d-\d\d-\d\d/).test(result.value.time.startDate), true)
  t.equals(RegExp(/^\d\d\d\d-\d\d-\d\d/).test(result.value.time.endDate), true)
  t.equals(req.query.time, '0,86400000')
})

test('validateParams - time params, YYYY-MM-DD', function (t) {
  const req = { params: { id: 'views:country' }, query: { time: '2017-01-01,2017-06-30' } }
  const result = validateParams(req)
  t.plan(6)
  t.equals(result.error, undefined)
  t.equals(result.value.metric[0], 'views')
  t.equals(result.value.dimension[0], 'country')
  t.equals(RegExp(/^\d\d\d\d-\d\d-\d\d/).test(result.value.time.startDate), true)
  t.equals(RegExp(/^\d\d\d\d-\d\d-\d\d/).test(result.value.time.endDate), true)
  t.equals(RegExp(/[0-9],[0-9]/).test(req.query.time), true)
})

test('validateParams - compound metric and dimension params', function (t) {
  const req = { params: { id: 'views,sessions:country,month' }, query: {} }
  const result = validateParams(req)
  t.plan(6)
  t.equals(result.error, undefined)
  t.equals(result.value.metric[0], 'views')
  t.equals(result.value.metric[1], 'sessions')
  t.equals(result.value.dimension[0], 'country')
  t.equals(result.value.dimension[1], 'month')
  t.equals(_.isEqual(result.value.outFields, ['views', 'sessions', 'country', 'month', 'timestamp']), true)
})

test('validateParams - "none" dimension', function (t) {
  const req = { params: { id: 'views' }, query: {} }
  const result = validateParams(req)
  t.plan(3)
  t.equals(result.error, undefined)
  t.equals(result.value.metric[0], 'views')
  t.equals(result.value.dimension.length, 0)
})

test('validateParams - compound dimension with "none"', function (t) {
  const req = { params: { id: 'views:month' }, query: {} }
  const result = validateParams(req)
  t.plan(4)
  t.equals(result.error, undefined)
  t.equals(result.value.metric[0], 'views')
  t.equals(result.value.dimension.length, 1)
  t.equals(result.value.dimension[0], 'month')
})

test('validateParams - where', function (t) {
  const req = { params: { id: 'views:country' }, query: { where: '(country=\'Canada\' OR \'United States\'=country) ANd views > 1000' } }
  const result = validateParams(req)
  t.plan(10)
  t.equals(result.error, undefined)
  t.equals(result.value.where.dimensionFilters.filters[0].key, 'country')
  t.equals(result.value.where.dimensionFilters.filters[0].value, 'Canada')
  t.equals(result.value.where.dimensionFilters.filters[0].operator, '=')
  t.equals(result.value.where.dimensionFilters.filters[1].key, 'country')
  t.equals(result.value.where.dimensionFilters.filters[1].value, 'United States')
  t.equals(result.value.where.dimensionFilters.filters[1].operator, '=')
  t.equals(result.value.where.metricFilters.filters[0].key, 'views')
  t.equals(result.value.where.metricFilters.filters[0].value, 1000)
  t.equals(result.value.where.metricFilters.filters[0].operator, '>')
})

test('validateParams - where with 1=1', function (t) {
  const req = { params: { id: 'views:country' }, query: { where: '1=1' } }
  const result = validateParams(req)
  t.plan(3)
  t.equals(result.error, undefined)
  t.equals(result.value.where.dimensionFilters.filters.length, 0)
  t.equals(result.value.where.metricFilters.filters.length, 0)
})

test('validateParams - where with 1=1 AND views > 100', function (t) {
  const req = { params: { id: 'views:country' }, query: { where: '1=1 AND views > 100' } }
  const result = validateParams(req)
  t.plan(3)
  t.equals(result.error, undefined)
  t.equals(result.value.where.dimensionFilters.filters.length, 0)
  t.equals(result.value.where.metricFilters.filters.length, 1)
})

test('validateParams - where with views > 100 AND (1=1)', function (t) {
  const req = { params: { id: 'views:country' }, query: { where: 'views > 100 AND (1=1)' } }
  const result = validateParams(req)
  t.plan(3)
  t.equals(result.error, undefined)
  t.equals(result.value.where.dimensionFilters.filters.length, 0)
  t.equals(result.value.where.metricFilters.filters.length, 1)
})

test('validateParams - where syntax error', function (t) {
  const req = { params: { id: 'views:country' }, query: { where: '(country="Canada" OR \'United States\'=country ANd views > 1000' } }
  const result = validateParams(req)
  t.plan(2)
  t.equals(result.error !== null, true)
  t.equals(result.error.code, 400)
})
