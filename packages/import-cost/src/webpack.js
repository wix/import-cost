const webpack = require('webpack');
const MemoryFS = require('memory-fs');
const BabiliPlugin = require('babili-webpack-plugin');
const pkgDir = require('pkg-dir');
const tmp = require('tmp');
const fs = require('fs');
const path = require('path');
const {gzipSync} = require('zlib');
const {getPackageJson} = require('./utils');

function getEntryPoint(packageInfo) {
  const tmpFile = tmp.fileSync();
  fs.writeFileSync(tmpFile.name, packageInfo.string, 'utf-8');
  return tmpFile;
}

function calcSize(packageInfo, callback) {
  const entryPoint = getEntryPoint(packageInfo);
  const packageRootDir = pkgDir.sync(path.dirname(packageInfo.fileName));
  const modulesDirectory = path.join(packageRootDir, 'node_modules');
  const peers = getPackageJson(packageInfo).peerDependencies || {};
  const defaultExternals = ['react', 'react-dom', 'lodash'];
  const externals = Object.keys(peers).concat(defaultExternals).filter(p => p !== packageInfo.name);

  const compiler = webpack({
    entry: entryPoint.name,
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production')
      }),
      new webpack.optimize.ModuleConcatenationPlugin(),
      new webpack.IgnorePlugin(/^electron$/),
      new BabiliPlugin()
    ],
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
      child_process: 'empty', //eslint-disable-line
      dns: 'empty'
    },
    externals,
    output: {
      filename: 'bundle.js'
    }
  });

  const memoryFileSystem = new MemoryFS();
  compiler.outputFileSystem = memoryFileSystem;

  compiler.run((err, stats) => {
    entryPoint.removeCallback();
    if (err || stats.toJson().errors.length > 0) {
      callback({err: err || stats.toJson().errors});
    } else {
      const size = stats.toJson().assets.filter(x => x.name === 'bundle.js').pop().size;
      const bundle = path.join(process.cwd(), 'bundle.js');
      const gzip = gzipSync(memoryFileSystem.readFileSync(bundle), {}).length;
      callback({size, gzip});
    }
  });
}

module.exports = {calcSize};
