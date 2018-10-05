# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## Unreleased
## Fixed
* Config sourced values of private key also need to be buffered with base64 decoding

## [1.1.1] - 2018-10-05
### Fixed
* Replace base64 decoding of private key. Needed for all deployments.

## [1.1.0] - 2018-10-04
### Changed
* Remove base64 decoding of private key and client email

### Fixed
* Incorrect reference to private key in config file.

## [1.0.0] - 2018-09-25
Initial release of the koop-provider-google-analytics

[1.1.1]: https://github.com/koopjs/koop-provider-google-analytics/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/koopjs/koop-provider-google-analytics/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/koopjs/koop-provider-google-analytics/releases/tag/v1.0.0