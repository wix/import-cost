const os = require('os');
const path = require('path');
const workerFarm = require('worker-farm');
const { URI } = require('vscode-uri');
const fsAdapter = require('native-fs-adapter');
const { debouncePromise, DebounceError } = require('./debounce-promise.js');
const { getPackageVersion } = require('./utils.js');
const { version: extensionVersion } = require('../package.json');
const { calcSize } = require('./webpack.js');

let workers = null;
function initWorkers(config) {
  if (!workerFarm.end) return;
  const debug = process.env.NODE_ENV === 'test';
  workers = workerFarm(
    {
      maxConcurrentWorkers: debug ? 1 : os.cpus().length - 1,
      maxRetries: 3,
      maxCallTime: config.maxCallTime || Infinity,
    },
    path.join(__dirname, 'webpack.js'),
    ['calcSize'],
  );
}

let sizeCache = {};
const versionsCache = {};
const failedSize = { size: 0, gzip: 0 };
const cacheFileName = path.join(os.tmpdir(), `ic-cache-${extensionVersion}`);

async function getSize(pkg, config) {
  await readSizeCache();
  try {
    versionsCache[pkg.string] =
      versionsCache[pkg.string] || (await getPackageVersion(pkg));
  } catch {
    return { ...pkg, ...failedSize };
  }
  const key = `${pkg.string}#${versionsCache[pkg.string]}`;
  if (sizeCache[key] === undefined || sizeCache[key] instanceof Promise) {
    try {
      sizeCache[key] = sizeCache[key] || calcPackageSize(pkg, config);
      sizeCache[key] = await sizeCache[key];
      await saveSizeCache();
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
      const fn = config.concurrent && workers ? workers.calcSize : calcSize;
      fn(packageInfo, (err, result) => (err ? reject(err) : resolve(result)));
    },
  );
}

async function clearSizeCache() {
  sizeCache = {};
  try {
    await fsAdapter.delete(URI.file(cacheFileName));
  } catch {
    // silent error
  }
}

async function readSizeCache() {
  try {
    if (Object.keys(sizeCache).length === 0) {
      sizeCache = JSON.parse(await fsAdapter.readFile(URI.file(cacheFileName)));
    }
  } catch {
    // silent error
  }
}

async function saveSizeCache() {
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
      await fsAdapter.writeFile(
        URI.file(cacheFileName),
        Buffer.from(JSON.stringify(cache, null, 2), 'utf8'),
      );
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
