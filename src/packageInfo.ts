import * as workerFarm from 'worker-farm';
import { debouncePromise, DebounceError } from './debouncedPromise';
import { workspace } from 'vscode';

const workers = workerFarm(require.resolve('./webpack'), ['calcSize']);
let sizeCache = {};

export async function getSize(pkg) {
  const key = pkg.string;
  if (sizeCache[key] === undefined || sizeCache[key] instanceof Promise) {
    try {
      sizeCache[key] = sizeCache[key] || calcPackageSize(pkg);
      sizeCache[key] = await sizeCache[key];
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
    workers.calcSize(packageInfo, result => result.err ? reject(result.err) : resolve(result.size));
  });
}

export function cleanup() {
  workerFarm.end(workers);
}
