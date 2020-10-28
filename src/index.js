const provider = {
  type: 'provider',
  name: 'google-analytics',
  disableIdParam: false,
  Model: require('./model'),
  version: require('../package.json').version
}

module.exports = provider
