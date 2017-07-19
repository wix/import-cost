# Import Cost VSCode Extension

This extension will display inline in the editor the size of the imported package.
The extension utilizes webpack with babili-webpack-plugin in order to detect the imported size.
![Example Image](https://file-gwpnofjfte.now.sh/Screen%20Shot%202017-07-15%20at%202.13.55%20PM.png)

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

## Notes

This extension creates a directory for temporary files called `.importcost`.  
Add this directory to the `.gitignore` file in order to keep the repo clean.

## Known Issues
- Importing two libraries with a common dependency will show the size of both libraries isolated from each other, even if the common library needs to be imported only once.
- Switching between files while calculating will cause a temporary mixup with the decorations

### 1.0.11

Switch from uglifyjs-webpack-plugin to babili-webpack-plugin

### 1.0.10

Display calculation results as they arrive

### 1.0.9

Update font theme

### 1.0.8

Add cross session cache

### 1.0.6

Initial release