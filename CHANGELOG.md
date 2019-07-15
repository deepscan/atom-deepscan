# Changelog

## v1.5.5

* Update rule definition (1.27.0)
* For the analysis improvements, see [this updates](https://deepscan.io/docs/updates/2019-07/)

## v1.5.4

* Update rule definition (1.26.0)
* For the analysis improvements, see [this updates](https://deepscan.io/docs/updates/2019-06/)

## v1.5.3

* Update rule definition (1.25.0)

## v1.5.2

* Update rule definition (1.24.0)
* For rules overlapping with ESLint, DeepScan now recognizes ESLint inline disable comments and filters out alarms when the corresponding ESLint alarm is disabled

## v1.5.1

* Update rule definition (1.23.0)
* [DUPLICATE_DECL](https://deepscan.io/docs/rules/duplicate-decl), [UNUSED_DECL](https://deepscan.io/docs/rules/unused-decl) and [UNUSED_VAR_ASSIGN](https://deepscan.io/docs/rules/unused-var-assign) alarms are filtered on test case code. For more information, see [here](https://deepscan.io/docs/guides/get-started/analyzing-source-code#excluded-test-rules).

## v1.5.0

* Update rule definition (1.22.0)
* Support ECMAScript Modules file (`*.mjs`)

## v1.4.11

* Update rule definition (1.21.0)

## v1.4.10

* Update rule definition (1.20.0)

## v1.4.9

* Update rule definition (1.19.0)

## v1.4.8

* Update rule definition (1.18.0)

## v1.4.7

* Provide an option to show/hide a full description of the message (for atom-ide-ui package, thanks to [@selfagency](https://github.com/deepscan/atom-deepscan/issues/2))

## v1.4.6

* Polish the description of settings

## v1.4.5

* Update rule definition (1.17.0-beta)

## v1.4.4

* For less noise, hide inline decorators when typing

## v1.4.3

* Update rule definition (1.16.0-beta)

## v1.4.2

* Update rule definition (1.15.0-beta)

## v1.4.1

* Update rule definition (1.14.0-beta)
* Sanitize HTML in markdown

## v1.4.0

* Show errors with inline decorators
* Update rule definition (1.13.0-beta)

## v1.3.0

* Show rule description when a user toggles the description in the message
* Update rule definition (1.12.0-beta)

## v1.2.0

* Vue.js support: Support code inspection for `*.vue` files on save

## v1.1.3

* Not to analyze a file over 30,000 lines
* Show a proper status and message when the active editor is changed

## v1.1.2

* Support to disable rules with inline comments. Check it [here](https://deepscan.io/docs/get-started/disabling-rules/).

## v1.1.1

* Change description of package.json
* Attach screenshot of Settings

## v1.1.0

* TypeScript support: Support code inspection for `*.ts` and `*.tsx` files on save
* Mark a character position properly for SYNTAX_ERROR

## v1.0.1

* Install package dependencies ('Linter' package)

## v1.0.0

* Initial release
