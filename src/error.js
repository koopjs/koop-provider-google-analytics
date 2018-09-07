/**
 * Extend the Error object so that it can be instantiated with a code
 */
class CodedError extends Error {
  constructor (message, code) {
    super(message)
    Error.captureStackTrace(this, CodedError)
    this.code = code || 500
  }
}

module.exports = { CodedError }
