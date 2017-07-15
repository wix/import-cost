# import-size Vscode Extension

This extension will display inline in the editor the size of the imported package.
The extension utilizes webpack with UglifyJSPlugin in order to detect the imported size.
![Example Image](https://file-cqspplrcly.now.sh/Screen%20Shot%202017-07-15%20at%201.42.28%20PM.png)

## Features

- Default importing: `import Func from 'utils';`
- Entire content importing: `import * as Utils from 'utils';`
- Selective importing: `import {map} from 'lodash';`
- Selective importing with alias: `import {map as map2} from 'lodash';`
- Submodule importing: `import map from 'lodash/map';`
- Require: `const map = require('lodash').map;`
- Supports both `Javascript` and `Typescript`

## Known Issues

Naive detection of local imports by searching for imports that start with the char `.`

### 1.0.0

Initial release