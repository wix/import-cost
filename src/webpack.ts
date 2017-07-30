import * as webpack from 'webpack';
import * as MemoryFS from 'memory-fs';
import * as BabiliPlugin from 'babili-webpack-plugin';
import * as pkgDir from 'pkg-dir';
import * as tmp from 'tmp';
import * as fs from 'fs';
import * as path from 'path';

function getEntryPoint(packageInfo) {
  const tmpFile = tmp.fileSync();
  fs.writeFileSync(tmpFile.name, packageInfo.string, 'utf-8');
  return tmpFile;
}

module.exports = function pack(packageInfo, callback) {
  const entryPoint = getEntryPoint(packageInfo);
  const modulesDirectory = path.join(pkgDir.sync(path.dirname(packageInfo.fileName)), 'node_modules');

  const compiler = webpack({
    entry: entryPoint.name,
    plugins: [new BabiliPlugin()],
    resolve: {
      modules: [modulesDirectory]
    }
  });

  (compiler as webpack.Compiler).outputFileSystem = new MemoryFS();

  compiler.run((err, stats) => {
    entryPoint.removeCallback();
    if (err || stats.toJson().errors.length > 0) {
      callback({err: err || stats.toJson().errors});
    } else {
      const size = Math.round(stats.toJson().assets[0].size / 1024);
      callback({size});
    }
  });
}
