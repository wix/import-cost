const path = require('path');

const config = {
  mode: 'production',
  target: 'node',
  entry: {
    extension: './src/extension.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].electron.js',
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
    mainFields: ['main'],
    extensions: ['.js'],
    alias: {
      'jest-worker': false,
      'uglify-js': false,
      '@swc/core': false,
      'esbuild': false,
    },
  },
};
module.exports = config;
