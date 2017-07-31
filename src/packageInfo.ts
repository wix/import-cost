import * as fs from 'fs';
import * as path from 'path';
import * as workerFarm from 'worker-farm';
import * as pkgDir from 'pkg-dir';
import { debouncePromise, DebounceError } from './debouncedPromise';
import { workspace } from 'vscode';

const workers = workerFarm(require.resolve('./webpack'), ['calcSize']);
const cacheFile = `${__dirname}/ic-cache`;
let sizeCache = {};
const versionsCache = {};
readSizeCache();

export async function getSize(pkg) {
  try {
    versionsCache[pkg.string] = versionsCache[pkg.string] || getPackageVersion(pkg);
  } catch (e) {
    return { ...pkg, size: 0 };
  }
  const key = `${pkg.string}#${versionsCache[pkg.string]}`;
  if (sizeCache[key] === undefined || sizeCache[key] instanceof Promise) {
    try {
      sizeCache[key] = sizeCache[key] || calcPackageSize(pkg);
      const size = await sizeCache[key];
      sizeCache[key] = size;
      saveSizeCache();
    } catch (e) {
      if (e === DebounceError) {
        delete sizeCache[key];
        throw e;
      } else {
        sizeCache[key] = 0;
      }
    }
  }
  return { ...pkg, size: sizeCache[key] };
}

function calcPackageSize(packageInfo) {
  return debouncePromise(`${packageInfo.fileName}#${packageInfo.line}`, (resolve, reject) => {
    workers.calcSize(
      packageInfo,
      result => (result.err ? reject(result.err) : resolve(result.size))
    );
  });
}

function readSizeCache() {
  try {
    if (fs.existsSync(cacheFile)) {
      sizeCache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    }
  } catch (e) {
    // silent error
  }
}

function saveSizeCache() {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(sizeCache, null, 2), 'utf-8');
  } catch (e) {
    // silent error
  }
}

function getPackageVersion(pkg): string {
  const modulesDirectory = path.join(pkgDir.sync(path.dirname(pkg.fileName)), 'node_modules');
  const [, pkgName] = pkg.name.match(/([^\/]+)/);
  const packageJsonPath = `${modulesDirectory}/${pkgName}/package.json`;
  const version = require(packageJsonPath).version;
  return version;
}

export function cleanup() {
  workerFarm.end(workers);
}
