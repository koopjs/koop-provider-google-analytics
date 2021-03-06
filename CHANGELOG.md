# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [2.0.1] - 2020-11-10
### Fixed
* correct path to main file

## [2.0.0] - 2020-11-10
### Changed
* Removed country geometry feature
* Remove :host parameter.  Metrics, dimensions, and non-geoservice query options are expected to be delimited in a single `:id` parameter.

## [1.3.0] - 2020-04-22
### Added
* Backfill option that adds empty rows when multiply dimensions are requested

## [1.2.2] - 2019-02-25
### Fixed
* Bumped version due to need to republish npm

## [1.2.1] - 2019-02-22
### Fixed
* hostname dimension value in a filter clause should be lowercased

## [1.2.0] - 2018-12-20
### Added
* Add hostname as a supported Google Analytics dimension

## [1.1.2] - 2018-10-05
### Fixed
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

[2.0.1]: https://github.com/koopjs/koop-provider-google-analytics/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/koopjs/koop-provider-google-analytics/compare/v1.3.0...v2.0.0
[1.3.0]: https://github.com/koopjs/koop-provider-google-analytics/compare/v1.2.2...v1.3.0
[1.2.2]: https://github.com/koopjs/koop-provider-google-analytics/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/koopjs/koop-provider-google-analytics/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/koopjs/koop-provider-google-analytics/compare/v1.1.2...v1.2.0
[1.1.2]: https://github.com/koopjs/koop-provider-google-analytics/compare/v1.1.1...v1.1.2
[1.1.1]: https://github.com/koopjs/koop-provider-google-analytics/compare/v1.1.0...v1.1.1
[1.1.0]: https://github.com/koopjs/koop-provider-google-analytics/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/koopjs/koop-provider-google-analytics/releases/tag/v1.0.0