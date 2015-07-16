# Change Log
All notable changes to this project will be documented in this file.

## [0.1.2] - 2015-07-16
### Fixed

- Schemas page wasn't loading when some data was missing. (Arik Fraimovich) [#16]
- Connection string parsing was sometimes failing. (Arik Fraimovich) [#16]

## [0.1.1] - 2015-04-14
### Added
- Load Errors Page (Oren Itamar) [#2]

### Fixed
- Alert button wasn't working due to alert() function stripping (Arik Fraimovich) [#5]

## 0.1.0 - 2015-04-06

First release.

#### Added
- Link, and make it obvious that date format is ISO 8601.
- Inflight queries view with option to cancel any query and view related alerts (when available; from STL_ALERT_EVENT_LOG).
- WLM queue view.
- Schemas view with additional information for each table including: total size (rows/MB), unsorted area size, is the table properly distributed and more.

[0.1.2]: https://github.com/everythingme/redshift_console/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/everythingme/redshift_console/compare/v0.1.0...v0.1.1
[#2]: https://github.com/EverythingMe/redshift_console/pull/2
[#5]: https://github.com/EverythingMe/redshift_console/pull/5
[#16]: https://github.com/EverythingMe/redshift_console/pull/16
