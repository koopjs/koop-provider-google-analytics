const _ = require('lodash')
const { Parser } = require('flora-sql-parser')
const parser = new Parser()
const { METRICS, DIMENSIONS, METRICS_OPERATORS } = require('./constants-and-lookups')
const { CodedError } = require('./error')

/**
 * Decomposes where clause into an array of predicate objects.
 * @param {string} whereSql the where clause string
 * @returns {object} with properties 'metricFilters' and 'dimensionFilters' (or 'error')
 */
function whereDecomposer (whereSql) {
  // Wrap parser in try, because it throws error on bad SQL
  try {
    const ast = parser.parse(`SELECT * FROM foo WHERE ${whereSql}`)

    // Enrich the WHERE AST with info needed for translation, validate that the WHERE can be translated to Google filters, then translate
    const enrichedAST = enrichAST(ast.where)
    const validated = validateTranslatable(enrichedAST)
    if (validated.error) return validated
    return translate(validated)
  } catch (error) {
    return { error }
  }
}

/**
 * Recursive function to travel the AST, ensure column values and operators are supportable. Enrich with information for validating support by Google analytics filtering.
 * @param {object} node of the AST produced by flora-sql-parser
 * @returns {object}
 */
function enrichAST (node) {
  if (node.left.column || node.right.column) {
    const result = {}
    const column = (node.left.column) ? node.left.column : node.right.column
    const value = (node.left.value) ? node.left.value : node.right.value

    // Handle malformed predicates
    if (!value) {
      result.error = new CodedError(`"where" predicate with "${column}" did not have value.`, 400)
      return result
    }

    // Ensure the column value is a supported metric or dimension
    if (METRICS.includes(column)) {
      result.types = ['metric']

      // Ensure the operator is supported by metric filters
      if (!METRICS_OPERATORS.includes(node.operator)) {
        result.error = new CodedError(`${node.operator} is not a currently supported metric operator.`, 400)
        return result
      }
    } else if (DIMENSIONS.includes(column)) {
      result.types = ['dimension']

      // Ensure the operator is supported by dimension filters
      if (node.operator !== '=') {
        result.error = new CodedError(`${node.operator} is not a currently supported dimension operator.`, 400)
        return result
      }
    } else {
      result.error = new CodedError(`${column} is not a supported metric or dimension.  Ensure metrics and dimension names are on the left side of the predicate`, 400)
      return result
    }

    result.predicates = [{ key: column, value, operator: node.operator, type: _.get(result, 'types[0]') }]
    return result
  }

  // Travel left branch of AST, bail out if any errors
  const left = enrichAST(node.left)
  if (left.error) return left

  // Travel right branch of AST, bail out if any errors
  const right = enrichAST(node.right)
  if (right.error) return right

  // Combine the array of logical operators, filter-types, and predicates found in left and right branches
  const logicalOperators = _.union((left.logicalOperators || []), (right.logicalOperators || []))
  const types = _.union((left.types || []), (right.types || []))
  const predicates = _.union(left.predicates, right.predicates)

  // Add any logical operator at this node to the logical operators array
  if (['AND', 'OR'].includes(node.operator)) logicalOperators.unshift(node.operator)

  return { left, right, types, logicalOperators, predicates }
}

/**
 * Ensure the WHERE AST is structured in a way such that it can be translated to Google Analytics filters
 * @param {object} enrichedAST the result of enrichedAST()
 * @returns {object}
 */
function validateTranslatable (enrichedAST) {
  // If errors have already been found, return
  if (enrichedAST.error) return enrichedAST

  // SQL attemps to logically a single metric and dimension predicate with OR. Not supported by Google Analytics.
  if (_.size(enrichedAST.logicalOperators) === 1 && enrichedAST.logicalOperators[0] === 'OR' && enrichedAST.types.length > 1) {
    enrichedAST.error = new CodedError('Metric and dimension filters cannot be combined with OR, only with AND.', 400)
  }

  // SQL contains more than one logical operator
  if (_.size(enrichedAST.logicalOperators) > 1) {
    // SQL attempts to logically combine metric and dimension predicates with more than one type of logical operator.  Not supported by Google Analytics
    if (enrichedAST.types.length === 1) enrichedAST.error = new CodedError('Multiple logical operators cannot be used to within a single predicate type (metrics or dimensions.', 400)
    else {
      // SQL attempts to logically combine sets of metric and dimension predicates with OR. Not supported by Google Analytics.
      if (enrichedAST.logicalOperators[0] === 'OR') enrichedAST.error = new CodedError('Metric and dimension predicates cannot be combined with OR, only with AND.', 400)

      // Sets of metrics predicates need to be partioned in left and right parenthesis at the top level of the AST.
      else if (enrichedAST.left.types.length > 1 || enrichedAST.right.types.length > 1) enrichedAST.error = new CodedError('Metric and dimension predicates should be partioned into left and right collections with parenthesis, e.g. (views > 50 OR session > 20) AND (itemId=\'abcd123\' OR country=\'United States\')', 400)
      // Predicates within a partitioned set can only be combined with one type of logical operator (AND or OR, not both)
      else if (_.size(enrichedAST.left.logicalOperators) > 1 || _.size(enrichedAST.right.logicalOperators) > 1) enrichedAST.error = new CodedError('Mixed logical operators (AND, OR) within sets of metric or dimension predicates are not supported', 400)
    }
  }
  return enrichedAST
}

/**
 * Translate the WHERE AST to arrays of metric and dimension filter clause objects
 * @param {*} enrichedAST
 * @returns {object}
 */
function translate (enrichedAST) {
  // If error, exit
  if (enrichedAST.error) return enrichedAST
  const metricFilters = {}
  const dimensionFilters = {}

  // Organize predicates by type
  metricFilters.filters = enrichedAST.predicates.filter(p => p.type === 'metric')
  dimensionFilters.filters = enrichedAST.predicates.filter(p => p.type === 'dimension')

  // If there is only one logical operators, use it as the operator for Goog metric and dimension filters
  if (enrichedAST.logicalOperators && enrichedAST.logicalOperators.length === 1) {
    metricFilters.operator = enrichedAST.logicalOperators[0]
    dimensionFilters.operator = enrichedAST.logicalOperators[0]
  }

  // If there metric and dimension types are both present, look at left and right branches to determine proper logical operators for each type
  if (enrichedAST.types.length > 1) {
    if (enrichedAST.left.types[0] === 'metric') {
      metricFilters.operator = (enrichedAST.left.logicalOperators) ? enrichedAST.left.logicalOperators[0] : 'OR'
      dimensionFilters.operator = (enrichedAST.right.logicalOperators) ? enrichedAST.right.logicalOperators[0] : 'OR'
    } else {
      dimensionFilters.operator = (enrichedAST.left.logicalOperators) ? enrichedAST.left.logicalOperators[0] : 'OR'
      metricFilters.operator = (enrichedAST.right.logicalOperators) ? enrichedAST.right.logicalOperators[0] : 'OR'
    }
  }

  return { metricFilters, dimensionFilters }
}

module.exports = { whereDecomposer }
