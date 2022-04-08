const { getSize, cleanup } = require('./package-info.js');
const { getPackageVersion } = require('./utils.js');
const { getPackages } = require('./parser.js');
const { EventEmitter } = require('events');
const { Lang } = require('./langs.js');

function importCost(
  fileName,
  text,
  language,
  config = { maxCallTime: Infinity, concurrent: true },
) {
  if (process.browser) {
    config.concurrent = false; //TBD make concurrency work in browser
  }
  const emitter = new EventEmitter();
  const log = s => emitter.emit('log', s);
  setTimeout(async () => {
    try {
      log(`Scanning ${fileName} for packages...`);
      let imports = getPackages(fileName, text, language).filter(
        packageInfo => !packageInfo.name.startsWith('.'),
      );
      log(`Found ${imports.length} packages`);
      await Promise.allSettled(
        imports.map(async pkg => (pkg.version = await getPackageVersion(pkg))),
      );
      imports = imports.filter(pkg => {
        log(`${pkg.version ? 'Found' : 'Skip'}: ${JSON.stringify(pkg)}`);
        return !!pkg.version;
      });
      emitter.emit('start', imports);
      const promises = imports.map(packageInfo =>
        getSize(packageInfo, config).then(packageInfo => {
          emitter.emit('calculated', packageInfo);
          return packageInfo;
        }),
      );
      emitter.emit('done', await Promise.all(promises));
    } catch (e) {
      emitter.emit('error', e);
    }
  }, 0);
  return emitter;
}

module.exports = {
  importCost,
  cleanup,
  Lang,
};
