const os = require('os');
const { URI } = require('vscode-uri');
const fsAdapter = require('native-fs-adapter');
const path = require('path');
const {
  getPackageJson,
  getPackageModuleContainer,
  pkgDir,
} = require('./utils.js');
const webpack = require('webpack');
const MemoryFS = require('memory-fs');
const { gzipSync } = require('zlib');

async function getEntryPoint(packageInfo) {
  const tmpFile = path.join(
    os.tmpdir(),
    `${Math.random().toString(36).slice(2)}.js`,
  );
  await fsAdapter.writeFile(
    URI.file(tmpFile),
    Buffer.from(packageInfo.string, 'utf8'),
  );
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
    // optimization: {
    //   minimize: false,
    //   // minimizer: [new TerserPlugin()],
    // },
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
      modules: [
        modulesDirectory,
        await getPackageModuleContainer(packageInfo),
        'node_modules',
      ],
      fallback: {
        fs: false,
        tls: false,
        net: false,
        path: false,
        zlib: false,
        http: false,
        https: false,
        stream: false,
        crypto: false,
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
  const memoryFileSystem = new MemoryFS();
  compiler.outputFileSystem = memoryFileSystem;

  compiler.inputFileSystem = {
    readlink: (path, options, callback) => {
      if (!callback) callback = options;
      setTimeout(() => callback(new Error('readlink not supported')), 0);
    },
    readFile: (path, options, callback) => {
      if (!callback) callback = options;
      fsAdapter
        .readFile(URI.file(path))
        .then(buffer => callback(null, buffer))
        .catch(callback);
    },
    stat: (path, options, callback) => {
      if (!callback) callback = options;
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
    },
  };

  compiler.run((err, stats) => {
    if (err || stats.toJson().errors.length > 0) {
      callback({ err: err || stats.toJson().errors });
    } else {
      const bundles = stats
        .toJson()
        .assets.filter(asset => asset.name.includes('bundle.js'));
      const size = bundles.reduce((sum, pkg) => sum + pkg.size, 0);
      const gzip = bundles
        .map(bundle => path.join(process.cwd(), 'dist', bundle.name))
        .map(
          bundleFile =>
            gzipSync(memoryFileSystem.readFileSync(bundleFile).toString(), {})
              .length,
        )
        .reduce((sum, gzipSize) => sum + gzipSize, 0);
      callback(null, { size, gzip });
    }
  });
}

module.exports = {
  calcSize,
};
