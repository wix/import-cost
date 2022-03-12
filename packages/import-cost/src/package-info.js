const fs = require('fs');
const os = require('os');
const path = require('path');
const workerFarm = require('worker-farm');
const pkgDir = require('pkg-dir');
const { debouncePromise, DebounceError } = require('./debounce-promise.js');
const { getPackageVersion, parseJson } = require('./utils.js');
const { calcSize } = require('./webpack.js');

const MAX_WORKER_RETRIES = 3;
const MAX_CONCURRENT_WORKERS = os.cpus().length - 1;

const debug = process.env.NODE_ENV === 'test';
let workers = null;

function initWorkers(config) {
  workers = workerFarm(
    {
      maxConcurrentWorkers: debug ? 1 : MAX_CONCURRENT_WORKERS,
      maxRetries: MAX_WORKER_RETRIES,
      maxCallTime: config.maxCallTime || Infinity,
    },
    require.resolve('./webpack.js'),
    ['calcSize'],
  );
}

const extensionVersion = parseJson(pkgDir.sync(__dirname)).version;
let sizeCache = {};
const versionsCache = {};
const failedSize = { size: 0, gzip: 0 };
const cacheFileName = path.join(__dirname, `ic-cache-${extensionVersion}`);

async function getSize(pkg, config) {
  readSizeCache();
  try {
    versionsCache[pkg.string] =
      versionsCache[pkg.string] || getPackageVersion(pkg);
  } catch (e) {
    return { ...pkg, ...failedSize };
  }
  const key = `${pkg.string}#${versionsCache[pkg.string]}`;
  if (sizeCache[key] === undefined || sizeCache[key] instanceof Promise) {
    try {
      sizeCache[key] = sizeCache[key] || calcPackageSize(pkg, config);
      sizeCache[key] = await sizeCache[key];
      saveSizeCache();
    } catch (e) {
      if (e === DebounceError) {
        delete sizeCache[key];
        throw e;
      } else {
        sizeCache[key] = failedSize;
        return { ...pkg, ...sizeCache[key], error: e };
      }
    }
  }
  return { ...pkg, ...sizeCache[key] };
}

function calcPackageSize(packageInfo, config) {
  if (!workers) {
    initWorkers(config);
  }

  return debouncePromise(
    `${packageInfo.fileName}#${packageInfo.line}`,
    (resolve, reject) => {
      const fn = config.concurrent ? workers.calcSize : calcSize;
      fn(packageInfo, (err, result) => (err ? reject(err) : resolve(result)));
    },
  );
}

function clearSizeCache() {
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
    const keys = Object.keys(sizeCache).filter(key => {
      const size = sizeCache[key] && sizeCache[key].size;
      return typeof size === 'number' && size > 0;
    });
    const cache = keys.reduce(
      (obj, key) => ({ ...obj, [key]: sizeCache[key] }),
      {},
    );
    if (Object.keys(cache).length > 0) {
      fs.writeFileSync(cacheFileName, JSON.stringify(cache, null, 2), 'utf-8');
    }
  } catch (e) {
    // silent error
  }
}

function cleanup() {
  if (workers) {
    workerFarm.end(workers);
    workers = null;
  }
}

module.exports = {
  getSize,
  clearSizeCache,
  cleanup,
  cacheFileName,
};
