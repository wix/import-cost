const path = require('path');

const config = {
  mode: 'development',
  target: 'webworker',
  entry: './src/extension.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]',
  },
  devtool: 'source-map',
  node: {
    __dirname: true,
  },
  externals: {
    vscode: 'commonjs vscode',
  },
  resolve: {
    mainFields: ['browser', 'module', 'main'],
    extensions: ['.js'],
    alias: {
      'native-fs-adapter': require.resolve('./src/fs'),
      'worker-farm': false,
      'terser-webpack-plugin': false,
      'graceful-fs': false,
      'inspector': false,
    },
    fallback: {
      fs: require.resolve('memfs'),
      process: require.resolve('process/browser'),
      path: require.resolve('./src/path'),
      os: require.resolve('os-browserify/browser'),
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      constants: require.resolve('constants-browserify'),
      http: require.resolve('stream-http'),
      https: require.resolve('https-browserify'),
      vm: require.resolve('vm-browserify'),
      zlib: require.resolve('browserify-zlib'),
      // assert: require.resolve('assert'),
      // buffer: require.resolve('buffer'),
      // querystring: require.resolve('querystring-es3'),
      // url: require.resolve('url'),
      // util: require.resolve('util'),
    },
  },
};
module.exports = config;
