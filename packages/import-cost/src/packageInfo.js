import fs from 'fs';
import path from 'path';
import workerFarm from 'worker-farm';
import pkgDir from 'pkg-dir';
import {debouncePromise, DebounceError} from './debouncePromise';

const workers = workerFarm(require.resolve('./webpack'), ['calcSize']);
const extensionVersion = getVersion(pkgDir.sync(__dirname));
export const cacheFileName = path.join(__dirname, `ic-cache-${extensionVersion}`);
let sizeCache = {};
const versionsCache = {};

export async function getSize(pkg) {
  readSizeCache();
  try {
    versionsCache[pkg.string] = versionsCache[pkg.string] || getPackageVersion(pkg);
  } catch (e) {
    return {...pkg, size: 0};
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
        return {...pkg, size: 0, error: e};
      }
    }
  }
  return {...pkg, size: sizeCache[key]};
}

function calcPackageSize(packageInfo) {
  return debouncePromise(`${packageInfo.fileName}#${packageInfo.line}`, (resolve, reject) => {
    const debug = process.env.NODE_ENV === 'test';
    const calcSize = debug ? require('./webpack').calcSize : workers.calcSize;
    calcSize(
      packageInfo,
      result => (result.err ? reject(result.err) : resolve(result.size))
    );
  });
}

export function clearSizeCache() {
  sizeCache = {};
  if (fs.existsSync(cacheFileName)) {
    fs.unlinkSync(cacheFileName);
  }
}

function readSizeCache() {
  try {
    if (Object.keys(sizeCache).length === 0 && fs.existsSync(cacheFileName)) {
      sizeCache = JSON.parse(fs.readFileSync(cacheFileName, 'utf-8'));
    }
  } catch (e) {
    // silent error
  }
}

function saveSizeCache() {
  try {
    const keys = Object.keys(sizeCache).filter(key => typeof sizeCache[key] === 'number' && sizeCache[key] > 0);
    const cache = keys.reduce((obj, key) => ({...obj, [key]: sizeCache[key]}), {});
    if (Object.keys(cache).length > 0) {
      fs.writeFileSync(cacheFileName, JSON.stringify(cache, null, 2), 'utf-8');
    }
  } catch (e) {
    // silent error
  }
}

function getVersion(dir) {
  const pkg = path.join(dir, 'package.json');
  return JSON.parse(fs.readFileSync(pkg, 'utf-8')).version;
}

function getPackageVersion(pkg) {
  const modulesDirectory = path.join(pkgDir.sync(path.dirname(pkg.fileName)), 'node_modules');
  const pkgParts = pkg.name.split('/');
  let pkgName = pkgParts.shift();
  if (pkgName.startsWith('@')) {
    pkgName = path.join(pkgName, pkgParts.shift());
  }

  const version = getVersion(path.join(modulesDirectory, pkgName));
  return `${pkgName}@${version}`;
}

export function cleanup() {
  workerFarm.end(workers);
}
