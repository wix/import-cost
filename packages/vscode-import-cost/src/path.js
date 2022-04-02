const path = require('path-browserify');
path.win32 = path.win32 || path.posix;
module.exports = path;
