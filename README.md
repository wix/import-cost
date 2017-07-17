# Import Cost VSCode Extension

This extension will display inline in the editor the size of the imported package.
The extension utilizes webpack with UglifyJSPlugin in order to detect the imported size.
![Example Image](https://file-gwpnofjfte.now.sh/Screen%20Shot%202017-07-15%20at%202.13.55%20PM.png)

## Features

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

### 1.0.5

Initial release