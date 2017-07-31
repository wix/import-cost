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
      sizeCache[key] = await sizeCache[key];
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
    const keys = Object.keys(sizeCache).filter(key => typeof sizeCache[key] === 'number' && sizeCache[key] > 0);
    const cache = keys.reduce((obj, key) => ({...obj, [key]: sizeCache[key]}), {});
    fs.writeFileSync(cacheFile, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (e) {
    // silent error
  }
}

function getPackageVersion(pkg): string {
  const modulesDirectory = path.join(pkgDir.sync(path.dirname(pkg.fileName)), 'node_modules');
  const pkgName = pkg.name.split('/').shift();
  const packageJsonPath = `${modulesDirectory}/${pkgName}/package.json`;
  const version = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')).version;
  return `${pkgName}@${version}`;
}

export function cleanup() {
  workerFarm.end(workers);
}
