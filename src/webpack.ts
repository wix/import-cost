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

export function calcSize(packageInfo, callback) {
  const entryPoint = getEntryPoint(packageInfo);
  const modulesDirectory = path.join(pkgDir.sync(path.dirname(packageInfo.fileName)), 'node_modules');

  const compiler = webpack({
    entry: entryPoint.name,
    plugins: [new BabiliPlugin()],
    resolve: {
      modules: [modulesDirectory, 'node_modules']
    },
    module: {
      rules: [{
        test: /\.s?css$/,
        use: 'css-loader'
      }, {
        test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|wav)(\?.*)?$/,
        loader: 'url-loader',
        options: {
          name: '[path][name].[ext]?[hash]',
          limit: 10000
        }
      }]
    },
    node: {
      fs: 'empty',
      net: 'empty',
      tls: 'empty',
      module: 'empty',
      child_process: 'empty',
      dns: 'empty'
    },
    output: {
      filename: 'bundle.js'
    }
  });

  (compiler as webpack.Compiler).outputFileSystem = new MemoryFS();

  compiler.run((err, stats) => {
    entryPoint.removeCallback();
    if (err || stats.toJson().errors.length > 0) {
      callback({err: err || stats.toJson().errors});
    } else {
      const size = stats.toJson().assets.filter(x => x.name === 'bundle.js').pop().size;
      callback({size});
    }
  });
}
