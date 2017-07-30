import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';
import * as MemoryFS from 'memory-fs';
import * as BabiliPlugin from 'babili-webpack-plugin';
import * as pkgDir from 'pkg-dir';
import * as tmp from 'tmp';
import { debouncePromise, DebounceError } from './debouncedPromise';
import { workspace } from 'vscode';
import logger from './logger';
const cacheFile = tmp.fileSync().name;
let sizeCache = {};
loadSizeCache();

function loadSizeCache() {
  try {
    if (fs.existsSync(cacheFile)) {
      sizeCache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    }
  } catch (e) {
    logger.log('Failed to load cache from file:' + e);
  }
}

function saveSizeCache() {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(sizeCache, null, 2), 'utf-8');
  } catch (e) {
    logger.log('Failed to write cache to file:' + e);
  }
}

export async function getSize(pkg) {
  const key = pkg.string;
  if (sizeCache[key] === undefined || sizeCache[key] instanceof Promise) {
    logger.log('decorating "calculating" for ' + pkg.name);
    try {
      sizeCache[key] = sizeCache[key] || getPackageSize(pkg);
      sizeCache[key] = await sizeCache[key];
      logger.log('got size successfully');
    } catch (e) {
      if (e === DebounceError) {
        delete sizeCache[key];
        throw e;
      } else {
        logger.log('couldnt calculate size');
        sizeCache[key] = 0;
      }
    }
    saveSizeCache();
  }
  return { ...pkg, size: sizeCache[key] };
}

function getPackageSize(packageInfo) {
  return debouncePromise(`${packageInfo.fileName}#${packageInfo.line}`, (resolve, reject) => {
    const entryPoint = getEntryPoint(packageInfo);
    // const wp = require('child_process').fork(path.join(__dirname, 'webpack'), [entryPoint.name,
    //   path.join(pkgDir.sync(path.dirname(packageInfo.fileName)), 'node_modules')])
    // wp.on('message', m => {
    //   entryPoint.removeCallback();
    //   if (m.err) {
    //     reject(m.err);
    //   } else {
    //     resolve(m.size);
    //   }
    // });
    const compiler = webpack({
      entry: entryPoint.name,
      plugins: [new BabiliPlugin()],
      resolve: {
        modules: [path.join(pkgDir.sync(path.dirname(packageInfo.fileName)), 'node_modules')]
      }
    });
    (compiler as webpack.Compiler).outputFileSystem = new MemoryFS();
    compiler.run((err, stats) => {
      entryPoint.removeCallback();
      if (err || stats.toJson().errors.length > 0) {
        logger.log('received error in webpack compilations: ' + err);
        reject(err || stats.toJson().errors);
      } else {
        const size = Math.round(stats.toJson().assets[0].size / 1024);
        logger.log('size is: ' + size);
        resolve(size);
      }
    });
  });
}

function getEntryPoint(packageInfo) {
  const tmpFile = tmp.fileSync();
  fs.writeFileSync(tmpFile.name, packageInfo.string, 'utf-8');
  logger.log('creating entry point file:' + tmpFile.name + '|' + packageInfo.string);
  return tmpFile;
}
