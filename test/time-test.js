const test = require('tape')
const { timeDimensionToTimestamp } = require('../src/validation/time')
const timezone = 'America/New_York'
const timezoneChicago = 'America/Chicago'

test('timeDimensionToTimestamp - convert time dimension of type "month" to timestamp', function (t) {
  t.plan(1)
  const timestamp = timeDimensionToTimestamp('month', '201701', timezone)
  t.equals(timestamp, '2017-01-31T23:59:59.999-0500')
})

test('timeDimensionToTimestamp - convert time dimension of type "week" to timestamp', function (t) {
  t.plan(1)
  const timestamp = timeDimensionToTimestamp('week', '201701', timezone)
  t.equals(timestamp, '2001-01-06T23:59:59.999-0500')
})

test('timeDimensionToTimestamp - convert time dimension of type "day" to timestamp', function (t) {
  t.plan(1)
  const timestamp = timeDimensionToTimestamp('day', '20170101', timezone)
  t.equals(timestamp, '2017-01-01T23:59:59.999-0500')
})

test('timeDimensionToTimestamp - convert time dimension of type "hour" to timestamp', function (t) {
  t.plan(1)
  const timestamp = timeDimensionToTimestamp('hour', '2017010112', timezone)
  t.equals(timestamp, '2017-01-01T12:59:59.999-0500')
})

test('timeDimensionToTimestamp - Demonstrate that different source timezone results in different UTC offset', function (t) {
  t.plan(1)
  const timestamp = timeDimensionToTimestamp('month', '201701', timezoneChicago)
  t.equals(timestamp, '2017-01-31T23:59:59.999-0600')
})
