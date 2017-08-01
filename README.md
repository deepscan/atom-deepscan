# atom-deepscan

[![Version](https://img.shields.io/apm/v/atom-deepscan.svg?style=flat-square)](https://atom.io/packages/atom-deepscan)

Atom package to detect bugs and quality issues in JavaScript code including React. Works with [DeepScan](https://deepscan.io).

DeepScan is a cutting-edge JavaScript code inspection tool that helps you to find bugs and quality issues more precisely by data-flow analysis. You can also use it for React because DeepScan delivers [React specific rules](https://deepscan.io/docs/rules/#react).

> **Note:**
> To use this extension, you should confirm that your code is transferred to the DeepScan server for inspection when you save your changes.
> You can confirm it by pressing the Confirm button that appears when restarting VS Code after the installation.
>
> Note that your code is completely deleted from the server right after the inspection.

![Navigation](https://github.com/deepscan/atom-deepscan/raw/master/preview.png)

## Installation

```ShellSession
apm install atom-deepscan
```

## How it works

- Report issues in the Linter view when you open a JS or JSX file and save it.
- Highlight issues in the code.
- For support of `.jsx` file, include grammar of [atom-react](https://github.com/orktes/atom-react).

## Settings Options

This plugin contributes the following variables to the settings:

- `enable`: enable/disable DeepScan. Disabled by default. Enabled when you confirm.
- `server`: set an url of DeepScan server. "https://deepscan.io" by default.
- `ignoreRules`: set an array of rules to exclude.
