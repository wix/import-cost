const path = require('path');
const webpack = require('webpack');
const { fs } = require('memfs');
const { gzipSync, brotliCompressSync: brotliSync } = require('zlib');
const webpackConfig = require('./webpack-config.js');
const inputFileSystem = require('./input-file-system.js');

async function getEntryPoint(packageInfo) {
  const tmpFile = `/tmp/${Math.random().toString(36).slice(2)}.js`;
  if (!fs.existsSync('/tmp')) {
    fs.mkdirSync('/tmp');
  }
  fs.writeFileSync(tmpFile, Buffer.from(packageInfo.string, 'utf8'));
  return tmpFile;
}

async function calcSize(packageInfo, config, callback) {
  const compiler = webpack(
    await webpackConfig(await getEntryPoint(packageInfo), packageInfo, config),
  );
  compiler.outputFileSystem = fs;
  compiler.inputFileSystem = inputFileSystem(fs);

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
      const brotli = bundles
        .map(bundle => path.join(process.cwd(), 'dist', bundle.name))
        .map(
          bundleFile =>
            brotliSync(fs.readFileSync(bundleFile).toString(), {}).length,
        )
        .reduce((sum, brotliSize) => sum + brotliSize, 0);
      callback(null, { size, gzip, brotli });
    }
  });
}

module.exports = {
  calcSize,
};
