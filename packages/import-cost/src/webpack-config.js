const webpack = require('webpack');
const path = require('path');
const {
  getPackageJson,
  getPackageModuleContainer,
  pkgDir,
} = require('./utils.js');
const TimeoutPlugin = require('./timeout-plugin.js');

async function webpackConfig(entry, packageInfo, { maxCallTime }) {
  const packageRootDir = await pkgDir(path.dirname(packageInfo.fileName));
  const modulesDirectory = path.join(packageRootDir, 'node_modules');
  const peers = (await getPackageJson(packageInfo)).peerDependencies || {};
  const defaultExternals = ['react', 'react-dom'];
  const externals = Object.keys(peers)
    .concat(defaultExternals)
    .filter(p => p !== packageInfo.name);
  return {
    entry,
    target: 'node',
    snapshot: {
      managedPaths: [],
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      new webpack.optimize.ModuleConcatenationPlugin(),
      new webpack.IgnorePlugin({ resourceRegExp: /^electron$/ }),
      new TimeoutPlugin(maxCallTime),
    ],
    resolve: {
      mainFields: ['browser', 'module', 'main'],
      modules: [
        modulesDirectory,
        await getPackageModuleContainer(packageInfo),
        'node_modules',
      ],
      fallback: {
        fs: false,
        tty: false,
        tls: false,
        net: false,
        path: false,
        zlib: false,
        http: false,
        util: false,
        https: false,
        assert: false,
        stream: false,
        crypto: false,
        events: false,
        readline: false,
        child_process: false,
      },
    },
    module: {
      rules: [
        {
          test: /\.s?css$/,
          use: 'css-loader',
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot|wav)(\?.*)?$/,
          loader: 'url-loader',
          options: {
            name: '[path][name].[ext]?[hash]',
            limit: 10000,
          },
        },
      ],
    },
    node: {
      global: true,
      __dirname: true,
      __filename: true,
    },
    externals,
    output: {
      filename: 'bundle.js',
      libraryTarget: 'commonjs2',
    },
  };
}

module.exports = webpackConfig;
