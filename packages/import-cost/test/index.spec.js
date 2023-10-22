const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { importCost: runner, cleanup, Lang } = require('../src/index.js');
const { clearSizeCache, cacheFileName } = require('../src/package-info.js');
const { DebounceError } = require('../src/debounce-promise.js');

function fixture(fileName) {
  return path.join(__dirname, 'fixtures', fileName);
}

function whenDone(emitter) {
  return new Promise((resolve, reject) => {
    let start;
    const calculated = [];
    emitter.on('start', packages => {
      expect(start).to.equal(undefined);
      start = packages;
    });
    emitter.on('calculated', packages => calculated.push(packages));
    emitter.on('done', packages => {
      expect(start.length).to.equal(packages.length);
      expect(calculated.length).to.equal(packages.length);
      resolve(packages);
    });
    emitter.on('error', reject);
  });
}

const LANGUAGES = {
  ts: Lang.TYPESCRIPT,
  js: Lang.JAVASCRIPT,
  jsx: Lang.JAVASCRIPT,
  vue: Lang.VUE,
  svelte: Lang.SVELTE,
  gjs: Lang.GLIMMER_JS,
  gts: Lang.GLIMMER_TS,
};

async function check(fileName, pkg, config = { concurrent: false }) {
  const language = LANGUAGES[fileName.split('.').pop()];
  const content = fs.readFileSync(fixture(fileName), 'utf-8');
  const emitter = runner(fixture(fileName), content, language, config);
  return (await whenDone(emitter)).find(x => x.name === pkg);
}

async function verify(
  fileName,
  pkg = 'chai',
  minSize = 10000,
  maxSize = 15000,
  gzipLowBound = 0.01,
  gzipHighBound = 0.8,
) {
  const { size, gzip } = await check(fileName, pkg);
  expect(size).to.be.within(minSize, maxSize);
  expect(gzip).to.be.within(size * gzipLowBound, size * gzipHighBound);
}

async function timed(fileName) {
  const time = process.hrtime.bigint();
  await verify(fileName);
  return Math.round(Number(process.hrtime.bigint() - time) / 1e6);
}

describe('importCost', () => {
  beforeEach(() => clearSizeCache());
  afterEach(() => {
    clearSizeCache();
    cleanup();
  });

  describe('imports', () => {
    it('calculates size of require in javascript', () => {
      return verify('require.js');
    });
    it('calculates size of require in typescript', () => {
      return verify('require.ts');
    });
    it('calculates size of template require in javascript', () => {
      return verify('require-template.js');
    });
    it('calculates size of template require in typescript', () => {
      return verify('require-template.ts');
    });
    it('calculates size of import in javascript', () => {
      return verify('import.js');
    });
    it('calculates size of import in typescript', () => {
      return verify('import.ts');
    });
    it('calculate size of imports in a file containing typescript features not supported by babel', () => {
      return verify('typescript-not-supported-features.ts');
    });
    it('calculates size of aliased import in javascript', () => {
      return verify('import-aliased.js');
    });
    it('calculates size of aliased import in typescript', () => {
      return verify('import-aliased.ts');
    });
    it('calculates size of import with no semicolon in typescript', () => {
      return verify('import-no-semicolon.ts');
    });
    it('calculates size of legacy import in javascript', () => {
      return verify('import-legacy.js');
    });
    it('calculates size of legacy import in typescript', () => {
      return verify('import-legacy.ts');
    });
    it('calculates size of node import in javascript', () => {
      return verify('import-node.js', 'node-stuff');
    });
    it('calculates size of namespace import in javascript', () => {
      return verify('import-namespace.js');
    });
    it('calculates size of imports in a file with shorthand react fragments', () => {
      return verify('react-fragments.jsx');
    });
    it('calculates size of namespace import in typescript', () => {
      return verify('import-namespace.ts');
    });
    it('calculates size of specifiers import in javascript', () => {
      return verify('import-specifiers.js');
    });
    it('calculates size of specifiers import in typescript', () => {
      return verify('import-specifiers.ts');
    });
    it('calculates size of mixed default+named import in javascript', () => {
      return verify('import-mixed.js');
    });
    it('calculates size of mixed default+named import in typescript', () => {
      return verify('import-mixed.ts');
    });
    it('calculates size of mixed default+global import in javascript', () => {
      return verify('import-global-mixed.js', 'react');
    });
    it('calculates size of mixed default+global import in typescript', () => {
      return verify('import-global-mixed.ts', 'react');
    });
    it('calculates size of cherry pick import in javascript', () => {
      return verify('import-cherry.js', 'chai/abc');
    });
    it('calculates size of cherry pick import in typescript', () => {
      return verify('import-cherry.ts', 'chai/abc');
    });
    it('calculates size of scoped import in javascript', () => {
      return verify('import-scoped.js', '@angular/core');
    });
    it('calculates size of scoped import in typescript', () => {
      return verify('import-scoped.ts', '@angular/core');
    });
    it('calculates size of scoped esm import in javascript', () => {
      return verify('import-scoped-esm.js', '@angular/core/esm');
    });
    it('calculates size of scoped esm import in typescript', () => {
      return verify('import-scoped-esm.ts', '@angular/core/esm');
    });
    it('calculates size of shaken import in javascript', () => {
      return verify('import-shaken.js', 'react', 200, 300);
    });
    it('calculates size of shaken import in typescript', () => {
      return verify('import-shaken.ts', 'react', 200, 300);
    });
    it('calculates size of production env import in javascript', () => {
      return verify('import-env.js', 'react-dom', 200, 300);
    });
    it('calculates size of production env import in typescript', () => {
      return verify('import-env.ts', 'react-dom', 200, 300);
    });
    it('calculates size without externals', () => {
      return verify('import-externals.js', 'wix-style', 200, 300);
    });
    it('calculates size without peerDependencies', () => {
      return verify('import-peer.js', 'haspeerdeps', 200, 300);
    });
    it('supports a monorepo-like structure', () => {
      return verify('yarn-workspace/import-nested-project.js', 'chai');
    });
    it('supports a monorepo-like structure with scoped module', () => {
      return verify('yarn-workspace/import-with-scope.js', '@angular/core');
    });
    it('supports a monorepo-like structure with scoped module and file name', () => {
      return verify(
        'yarn-workspace/import-with-scope-filename.js',
        '@angular/core/index.js',
      );
    });
    it('calculates size of a dynamic import in javascript', () => {
      return verify('dynamic-import.js');
    });
    it('calculates size of a dynamic import in typescript', () => {
      return verify('dynamic-import.ts');
    });
    it('calculates size of a vue script', () => {
      return verify('vue.vue');
    });
    it('calculates size of a svelte script', () => {
      return verify('svelte.svelte');
    });
    it('calculates size of a glimmer-js script', () => {
      return verify('glimmer.gjs');
    });
    it('calculates size of a glimmer-ts script', () => {
      return verify('glimmer.gts');
    });
  });

  describe('caching', () => {
    const slow = async x => expect(await timed(x)).to.be.within(500, 2500);
    const fast = async x => expect(await timed(x)).to.be.within(0, 100);

    it('caches the results import string & version', async () => {
      await slow('import.js');
      await slow('import-specifiers.js');
      await fast('import.js');
    });
    it('ignores order of javascript imports for caching purposes', async () => {
      await slow('import-specifiers.js');
      await fast('import-specifiers-reversed.js');
      await slow('import-mixed.js');
      await fast('import-mixed-reversed.js');
    });
    it('ignores order of typescript imports for caching purposes', async () => {
      await slow('import-specifiers.ts');
      await fast('import-specifiers-reversed.ts');
      await slow('import-mixed.ts');
      await fast('import-mixed-reversed.ts');
    });
    it('debounce any consecutive calculations of same import line', () => {
      const line = x => whenDone(runner(fixture('import.js'), x, LANGUAGES.js));
      return Promise.all([
        expect(line('import "chai";')).to.be.rejectedWith(DebounceError),
        expect(line('import "chai/index";')).to.be.fulfilled,
      ]);
    });
    it('caches everything to filesystem', async () => {
      await slow('import.js');
      await clearSizeCache();
      await slow('import.js');
      fs.renameSync(cacheFileName, `${cacheFileName}.bak`);
      await clearSizeCache();
      fs.renameSync(`${cacheFileName}.bak`, cacheFileName);
      await fast('import.ts');
    });
  });

  describe('error handling', () => {
    it('not added to package list if dependency is missing', async () => {
      expect(await check('failed-missing.js', 'sinon')).to.eql(undefined);
    });
    it('results in 0 if bundle fails', async () => {
      expect((await check('failed-bundle.js', 'jest')).size).to.equal(0);
    });
    it('errors on broken javascript', () => {
      return expect(check('incomplete.bad.js')).to.be.rejected;
    });
    it('errors on broken typescript', () => {
      return expect(check('incomplete.bad.ts')).to.be.rejected;
    });
    it('errors on broken vue', () => {
      return expect(check('incomplete.bad.vue')).to.be.rejected;
    });
    it('completes with empty array for unknown file type', async () => {
      expect(await check('import.flow', 'chai')).to.eql(undefined);
    });
    it('should handle timeouts gracefully', async () => {
      const pkg = await check('require.js', 'chai', { maxCallTime: 10 });
      expect(pkg.size).to.equal(0);
      expect(pkg.error.type).to.equal('TimeoutError');
    });
  });
});
