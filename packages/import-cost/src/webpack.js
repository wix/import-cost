const { URI } = require('vscode-uri');
const fsAdapter = require('native-fs-adapter');
const path = require('path');
const {
  getPackageJson,
  getPackageModuleContainer,
  pkgDir,
} = require('./utils.js');
const webpack = require('webpack');
const { fs } = require('memfs');
const { gzipSync } = require('zlib');

async function getEntryPoint(packageInfo) {
  const tmpFile = `/tmp/${Math.random().toString(36).slice(2)}.js`;
  if (!fs.existsSync('/tmp')) {
    fs.mkdirSync('/tmp');
  }
  fs.writeFileSync(tmpFile, Buffer.from(packageInfo.string, 'utf8'));
  return tmpFile;
}

async function calcSize(packageInfo, callback) {
  const packageRootDir = await pkgDir(path.dirname(packageInfo.fileName));
  const modulesDirectory = path.join(packageRootDir, 'node_modules');
  const peers = (await getPackageJson(packageInfo)).peerDependencies || {};
  const defaultExternals = ['react', 'react-dom'];
  const externals = Object.keys(peers)
    .concat(defaultExternals)
    .filter(p => p !== packageInfo.name);
  const webpackConfig = {
    entry: await getEntryPoint(packageInfo),
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

  const compiler = webpack(webpackConfig);
  compiler.outputFileSystem = fs;

  compiler.inputFileSystem = {
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

  compiler.run((err, stats) => {
    if (err) {
      callback(err);
    } else if (stats.toJson().errors.length > 0) {
      callback(stats.toJson().errors);
    } else {
      const bundles = stats
        .toJson()
        .assets.filter(asset => asset.name.includes('bundle.js'));
      const size = bundles.reduce((sum, pkg) => sum + pkg.size, 0);
      const gzip = bundles
        .map(bundle => path.join(process.cwd(), 'dist', bundle.name))
        .map(
          bundleFile =>
            gzipSync(fs.readFileSync(bundleFile).toString(), {}).length,
        )
        .reduce((sum, gzipSize) => sum + gzipSize, 0);
      callback(null, { size, gzip });
    }
  });
}

module.exports = {
  calcSize,
};
