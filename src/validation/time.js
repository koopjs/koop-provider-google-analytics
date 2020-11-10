const moment = require('moment-timezone')

/**
 * Parse a time dimension value and convert to timestamp string with UTC offset set to the origin of the time dimension (set in Google Analytics)
 * interval; i.e., 20170101 would return a timestamp equivalent to last millisecond of 2017-01-01
 * @param {string} intervalLabel - the time dimension interval label: month, week, day, hour
 * @param {string} input - the time dimension value, a numeric string with concatenated date elements
 * @param {string} inputTimezone - implicit timezone for the time dimension input
 * @returns {string} - date string in form of YYYY-MM-DDTHH:mm:ss.SSSZZ
 */
function timeDimensionToTimestamp (intervalLabel, input, inputTimezone) {
  let m

  // Parse input string according to interval label
  if (intervalLabel === 'month') m = moment(input, 'YYYYMM').endOf(intervalLabel)
  else if (intervalLabel === 'week') m = moment(input, 'YYYYGG').endOf(intervalLabel)
  else if (intervalLabel === 'day') m = moment(input, 'YYYYMMDD').endOf(intervalLabel)
  else if (intervalLabel === 'hour') m = moment(input, 'YYYYMMDDHH').endOf(intervalLabel)

  // For the parsed date, calculate the difference between the local UTC offset and input-timezone UTC offset (minutes)
  const offsetAdjustment = m.utcOffset() - m.tz(inputTimezone).utcOffset()

  // Add offset adjustment and format with the input timezone. Ensures that time dimensions from GA are parsed with reference to the implicit timezone (set in GA Admin for View)
  // E.g., time-dimension 20170101 from GA where timezone is set to 'America/New_York', should be '2017-01-31T23:59:59.999-0500'
  return m.add(offsetAdjustment, 'minutes').tz(inputTimezone).format('YYYY-MM-DDTHH:mm:ss.SSSZZ')
}

module.exports = { timeDimensionToTimestamp }
