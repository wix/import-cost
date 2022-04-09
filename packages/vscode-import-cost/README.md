# Import Cost VSCode Extension ![Build Status](https://github.com/wix/import-cost/workflows/build/badge.svg)
[![](https://vsmarketplacebadge.apphb.com/version/wix.vscode-import-cost.svg)](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost) [![](https://vsmarketplacebadge.apphb.com/installs/wix.vscode-import-cost.svg)](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost)

This extension will display inline in the editor the size of the imported package.
The extension utilizes webpack in order to detect the imported size.

![Example Image](https://citw.dev/_next/image?url=%2Fposts%2Fimport-cost%2F1quov3TFpgG2ur7myCLGtsA.gif&w=1080&q=75)

## Features
Calculates the size of imports and requires.
Currently supports:

- Default importing: `import Func from 'utils';`
- Entire content importing: `import * as Utils from 'utils';`
- Selective importing: `import {Func} from 'utils';`
- Selective importing with alias: `import {orig as alias} from 'utils';`
- Submodule importing: `import Func from 'utils/Func';`
- Require: `const Func = require('utils').Func;`
- Supports both `Javascript` and `Typescript`

## Why & How
We detail the why and how in this blog post:
https://medium.com/@yairhaimo/keep-your-bundle-size-under-control-with-import-cost-vscode-extension-5d476b3c5a76

## Known Issues
- Importing two libraries with a common dependency will show the size of both libraries isolated from each other, even if the common library needs to be imported only once.
