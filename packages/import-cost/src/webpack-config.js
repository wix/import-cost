const webpack = require('webpack');
const path = require('path');
const {
  getPackageJson,
  getPackageModuleContainer,
  pkgDir,
} = require('./utils.js');
const TimeoutPlugin = require('./timeout-plugin.js');
const TerserPlugin = require('terser-webpack-plugin');

async function webpackConfig(entry, packageInfo, { maxCallTime }) {
  return {
    entry,
    target: 'node',
    snapshot: {
      managedPaths: [],
    },
    optimization: {
      minimize: true,
      minimizer: [new TerserPlugin({ parallel: false })],
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
        path.join(
          await pkgDir(path.dirname(packageInfo.fileName)),
          'node_modules',
        ),
        await getPackageModuleContainer(packageInfo),
        'node_modules',
      ],
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
    externals: Object.keys(
      (await getPackageJson(packageInfo)).peerDependencies || {},
    )
      .concat(['react', 'react-dom'])
      .filter(p => p !== packageInfo.name),
    output: {
      filename: 'bundle.js',
      libraryTarget: 'commonjs2',
    },
  };
}

module.exports = webpackConfig;
