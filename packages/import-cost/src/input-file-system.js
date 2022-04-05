const { URI } = require('vscode-uri');
const fsAdapter = require('native-fs-adapter');

function inputFileSystem(fs) {
  return {
    readlink: (path, options, callback) => {
      if (!callback) callback = options;
      setTimeout(() => callback(new Error('readlink not supported')), 0);
    },
    readFile: (path, options, callback) => {
      if (!callback) callback = options;
      if (path.startsWith('/tmp/')) {
        fs.readFile(path, callback);
      } else {
        fsAdapter
          .readFile(URI.file(path))
          .then(buffer => callback(null, buffer))
          .catch(callback);
      }
    },
    stat: (path, options, callback) => {
      if (!callback) callback = options;
      if (path.startsWith('/tmp/')) {
        fs.stat(path, callback);
      } else {
        fsAdapter
          .stat(URI.file(path))
          .then(stats =>
            callback(null, {
              size: stats.size,
              ctimeMs: stats.ctime,
              mtimeMs: stats.mtime,
              isFile: () => stats.type & 1,
              isDirectory: () => stats.type & 2,
            }),
          )
          .catch(callback);
      }
    },
  };
}

module.exports = inputFileSystem;
