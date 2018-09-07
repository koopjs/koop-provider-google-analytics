/*
  index.js

  This file is required. It's role is to specify configuration settings.

  Documentation: http://koopjs.github.io/docs/specs/provider/
*/

// Define the provider path
// /:name/:hosts?/:disableIdParam?/FeatureServer/:layer/:method
// e.g. /sample/FeatureServer/0/query
const provider = {
  type: 'provider',
  name: 'metrics',
  hosts: true, // if true, also adds disableIdParam
  disableIdParam: false, // if true, adds to path and req.params
  Model: require('./model'),
  version: require('../package.json').version
}

module.exports = provider
