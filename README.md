# atom-deepscan

[![Version](https://img.shields.io/apm/v/atom-deepscan.svg?style=flat-square)](https://atom.io/packages/atom-deepscan)
[![DeepScan Grade](https://deepscan.io/api/projects/337/branches/538/badge/grade.svg)](https://deepscan.io/dashboard/#view=project&pid=337&bid=538)

Atom package to detect bugs and quality issues in JavaScript, TypeScript, React and Vue.js. Works with [DeepScan](https://deepscan.io).

DeepScan is a cutting-edge JavaScript code inspection tool that helps you to find bugs and quality issues more precisely by data-flow analysis. You can also use it for React and Vue.js because DeepScan delivers [React specialized rules](https://deepscan.io/docs/rules/#react) and [Vue.js specialized rules](https://deepscan.io/docs/rules/#vue).

> **Note:**
> To use this extension, you should confirm that your code is transferred to the DeepScan server for inspection when you save your changes.
> You can confirm it by pressing the Confirm button that appears when restarting Atom after the installation.
>
> Note that your code is completely deleted from the server right after the inspection.

![Navigation](https://github.com/deepscan/atom-deepscan/raw/master/resources/preview.png)

## Installation

```ShellSession
apm install atom-deepscan
```

## How it works

- You need [Linter](https://atom.io/packages/linter) package. Once Linter package is installed, just restart Atom.
- Report issues in the Linter view when you open a JS or JSX file and save it.
- Highlight issues in the code.
- For support of `.jsx` file, include a grammar of [atom-react](https://github.com/orktes/atom-react).
- For support of `.ts` and `.tsx` file, include a grammar of [language-typescript-grammars-only](https://github.com/tcarlsen/language-typescript-grammars-only).
- For support of `.vue` file, include a grammar of [atom-vue](https://github.com/hedefalk/atom-vue).

## Settings Options

This plugin contributes the following variables to the settings:

- `enable`: Enable/disable DeepScan inspection. Disabled by default. Enabled when you confirm.
- `server`: Set an url of DeepScan server. "https://deepscan.io" by default.
- `ignoreRules`: Set an array of rules to exclude.
- `showDecorators`: Controls whether the problem of the code should be shown along with the code.
- `showFullDescription`: Controls whether the full description of the issue should be shown when you hover it. Applied after reopening the file.

![Settings](https://github.com/deepscan/atom-deepscan/raw/master/resources/settings.png)

### Disabling Rules with Inline Comments

While you can exclude rules project wide via `deepscan.ignoreRules` option, you can also disable a rule in a file using inline comment.
```javascript
const x = 0;
x = 1; x + 1; // deepscan-disable-line UNUSED_EXPR
```

Read more about it [here](https://deepscan.io/docs/get-started/disabling-rules/).
