# Import Cost VSCode Extension [![Build Status](https://travis-ci.org/wix/import-cost.svg?branch=master)](https://travis-ci.org/wix/import-cost) [![Build status](https://ci.appveyor.com/api/projects/status/ko48qav9qqb8fv8u?svg=true)](https://ci.appveyor.com/project/shahata/import-cost)


This extension will display inline in the editor the size of the imported package.
The extension utilizes webpack with babili-webpack-plugin in order to detect the imported size.
![Example Image](https://file-wkbcnlcvbn.now.sh/import-cost.gif)

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

## Configuration

The following properties are configurable:

```javascript
  // Upper size limit, in KB, that will count a package as a small package
  "importCost.smallPackageSize": 50,

  // Upper size limit, in KB, that will count a package as a medium package
  "importCost.mediumPackageSize": 100,

  // Decoration color for small packages
  "importCost.smallPackageColor": "#7cc36e",

  // Decoration color for medium packages
  "importCost.mediumPackageColor": "#7cc36e",

  // Decoration color for large packages
  "importCost.largePackageColor": "#d44e40",

  // File extensions to be parsed by the Typescript parser
  "importCost.typescriptExtensions": [
    "\\.tsx?$"
  ],

  // File extensions to be parsed by the Javascript parser
  "importCost.javascriptExtensions": [
    "\\.jsx?$"
  ]
```
Any package size above the mediumPackageSize limit will be considered large.


## Known Issues
- Importing two libraries with a common dependency will show the size of both libraries isolated from each other, even if the common library needs to be imported only once.

### 2.1.0

Added gzip size to decorations

### 2.0.0

- Split the project into two packages:
  - `vscode-import-cost`: VSCode specific extension
  - `import-cost`: The logic of the extension

  The split was done in order to ease the consumption of the logic from IDEs other than VSCode.

- Various bug fixes

### 1.3.1

Fix breakage on backticks

### 1.3.0

Add a way to configure the file extensions that will be parsed

### 1.2.1

Bug fix for a small webpack issue with node

### 1.2.0

Add the ability to configure different colored decocrations for different sized packages.

### 1.1.7

Bug fix for scoped packages (i.e. @angular/router)

### 1.1.6

reworked import reconstruction a bit in order to support `import React, {Component} from 'react';`

### 1.1.5

Bug fix for Typescript on Windows

### 1.1.4

Bug fix for disappearing decorators on incorrect syntax

### 1.1.3

Bug fixes and prettifying output

### 1.1.2

Fix typo

### 1.1.1

Fix cache location

### 1.1.0

Add back cross-session cache with support for library version

### 1.0.15

Update readme

### 1.0.13

- Calculate cost as-you-type
- Support multiple windows
- Remove the .importcost folder
- Add support for monorepo
- Calculations are done in parallel
- Temporarily remove cross-session cache
- Bug fixes

### 1.0.12

Fix cache bug

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
