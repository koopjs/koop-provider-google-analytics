// clean shutdown on `cntrl + c`
process.on('SIGINT', () => process.exit(0))
process.on('SIGTERM', () => process.exit(0))
const path = require('path')

process.env.NODE_CONFIG_DIR = process.env.NODE_CONFIG_DIR || path.join(__dirname, 'config')
process.env.NODE_CONFIG_ENV = 'index'

// Initialize Koop
const Koop = require('koop')
const koop = new Koop()

// Error handler
koop.server.use(function (err, req, res, next) {
  res.status(err.code || 500).json({ message: err.message })
})

// Install the Google-Analytics provider (once published this can be required from NPM)
const provider = require('./src')
koop.register(provider)

if (process.env.DEPLOY === 'export') {
  module.exports = koop.server
} else {
  // Start listening for HTTP traffic
  const config = require('config')
  // Set port for configuration or fall back to default
  const port = config.port || 8080
  koop.server.listen(port)

  const message = `

  Koop Server listening on ${port}

  Try it out in your browser: http://localhost:${port}/metrics/views/none/FeatureServer/0/query
  Or on the command line: curl --silent http://localhost:${port}/metrics/views/none/FeatureServer/0/query

  Press control + c to exit
  `
  console.log(message)
}
