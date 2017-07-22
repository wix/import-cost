import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';
import * as MemoryFS from 'memory-fs';
import * as BabiliPlugin from 'babili-webpack-plugin';
import * as pkgDir from 'pkg-dir';
import * as tmp from 'tmp';
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

export function getSizes(packages, decorate) {
  const sizes = Object.keys(packages)
    .map(async packageName => {
      const pkg = packages[packageName];
      const key = pkg.string;
      if (sizeCache[key] === undefined) {
        logger.log('decorating "calculating" for ' + packageName);
        decorate(pkg);
        try {
          sizeCache[key] = await getPackageSize(pkg);
          logger.log('got size successfully');
        } catch (e) {
          if (e === 'debounced') {
            throw e;
          } else {
            logger.log('couldnt calculate size');
            sizeCache[key] = 0;
          }
        }
        saveSizeCache();
      }
      return { ...pkg, size: sizeCache[key] };
    });
  return sizes;
}

const debouncedPromises = {};
const debouncedInProgressPromises = {};
function debouncedPromise(key, fn) {
  const promise = new Promise((resolve, reject) => {
    setTimeout(function check() {
      if (debouncedPromises[key] === promise) {
        if (debouncedInProgressPromises[key]) {
          debouncedInProgressPromises[key].catch(() => undefined).then(() => {
            delete debouncedInProgressPromises[key];
            check();
          });
        } else {
          debouncedInProgressPromises[key] = new Promise(fn);
          debouncedInProgressPromises[key].then(resolve).catch(reject);
        }
      } else {
        reject('debounced');
      }
    }, 500);
  });
  return debouncedPromises[key] = promise;
}

function getPackageSize(packageInfo) {
  return debouncedPromise(`${packageInfo.fileName}#${packageInfo.line}`, resolve => {
    const entryPoint = getEntryPoint(packageInfo);
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
        resolve(0);
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
