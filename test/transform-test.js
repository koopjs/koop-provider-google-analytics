const test = require('tape')
const { transformDimensionPredicate, transformMetricPredicate } = require('../src/transform')

test('transformDimensionPredicate', function (t) {
  t.plan(1)
  const fixture = {
    key: 'hostname',
    operator: '=',
    value: 'abc-def-ABC.example.com'
  }

  const result = transformDimensionPredicate(fixture)

  t.deepEquals(result, {
    dimensionName: 'ga:hostname',
    expressions: [
      'abc-def-abc.example.com'
    ],
    operator: 'EXACT'
  }, 'produced GA dimension filter-clause object; lowercased hostname value')
})


test('transformMetricPredicate', function (t) {
  t.plan(1)
  const fixture = {
    key: 'views',
    operator: '=',
    value: '1'
  }

  const result = transformMetricPredicate(fixture)

  t.deepEquals(result, {
    metricName: 'ga:pageviews',
    comparisonValue: '1',
    operator: 'EQUAL'
  }, 'produced GA metric filter-clause object')
})

