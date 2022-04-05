const TimeoutError = require('errno').create('TimeoutError');

class TimeoutPlugin {
  constructor(maxCallTime = Infinity) {
    this.maxCallTime = maxCallTime;
  }

  apply(compiler) {
    let fail = false;
    let timer = null;

    if (this.maxCallTime && this.maxCallTime !== Infinity) {
      setTimeout(() => (fail = true), this.maxCallTime);
    }

    compiler.hooks.compilation.tap('TimeoutPlugin', compilation => {
      const hooks = [
        'finishModules',
        'optimizeTree',
        'optimizeChunkModules',
        'additionalAssets',
        'optimizeAssets',
        'processAssets',
        //in case we passed process assets already we will just let it finish
      ];
      hooks.forEach(hook => {
        compilation.hooks[hook].tap('TimeoutPlugin', () => {
          if (fail) {
            throw new TimeoutError();
          }
        });
      });
    });

    compiler.hooks.normalModuleFactory.tap('TimeoutPlugin', nmf => {
      nmf.hooks.beforeResolve.tap('TimeoutPlugin', () => !fail);
    });
    compiler.hooks.contextModuleFactory.tap('TimeoutPlugin', cmf => {
      cmf.hooks.beforeResolve.tap('TimeoutPlugin', () => !fail);
    });
    compiler.hooks.done.tap('TimeoutPlugin', () => clearTimeout(timer));
    compiler.hooks.failed.tap('TimeoutPlugin', () => clearTimeout(timer));
  }
}

module.exports = TimeoutPlugin;
