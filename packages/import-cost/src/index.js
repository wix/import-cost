import { getSize, cleanup as kill } from './packageInfo';
import {
  getPackages,
  TYPESCRIPT as TYPESCRIPT_LANG,
  JAVASCRIPT as JAVASCRIPT_LANG,
} from './parser';
import { EventEmitter } from 'events';

export const TYPESCRIPT = TYPESCRIPT_LANG;
export const JAVASCRIPT = JAVASCRIPT_LANG;

export function cleanup() {
  kill();
}

export function importCost(
  fileName,
  text,
  language,
  config = { maxCallTime: Infinity, concurrent: true },
) {
  const emitter = new EventEmitter();
  setTimeout(async () => {
    try {
      const imports = getPackages(fileName, text, language).filter(
        packageInfo => !packageInfo.name.startsWith('.'),
      );
      emitter.emit('start', imports);
      const promises = imports
        .map(packageInfo => getSize(packageInfo, config))
        .map(promise =>
          promise.then(packageInfo => {
            emitter.emit('calculated', packageInfo);
            return packageInfo;
          }),
        );
      const packages = (await Promise.all(promises)).filter(x => x);
      emitter.emit('done', packages);
    } catch (e) {
      emitter.emit('error', e);
    }
  }, 0);
  return emitter;
}
