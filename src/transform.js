const { providerParamToGoogle, sqlToMetricOperators } = require('./constants-and-lookups')

/**
 * Transform parsed where clause dimension predicate to google filter
 * @param {object} predicate
 */
function transformDimensionPredicate (predicate) {
  // Special treatment for the hostname dimension; it should always be lowercase
  if (predicate.key === 'hostname') predicate.value = predicate.value.toLowerCase()
  return {
    dimensionName: providerParamToGoogle[predicate.key],
    operator: 'EXACT',
    expressions: [predicate.value]
  }
}

/**
 * Transform parsed where clause metric predicate to google filter
 * @param {object} predicate
 */
function transformMetricPredicate (predicate) {
  return {
    metricName: providerParamToGoogle[predicate.key],
    operator: sqlToMetricOperators[predicate.operator],
    comparisonValue: predicate.value
  }
}

module.exports = {
  transformDimensionPredicate,
  transformMetricPredicate
}
