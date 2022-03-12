const fs = require('fs');
const path = require('path');
const { expect } = require('chai');
const { importCost: runner, cleanup, Lang } = require('../src/index.js');
const { clearSizeCache, cacheFileName } = require('../src/package-info.js');
const { DebounceError } = require('../src/debounce-promise.js');

const DEFAULT_CONFIG = {
  concurrent: false,
  maxCallTime: Infinity
};
const workingFolder =
  typeof wallaby !== 'undefined'
    ? path.join(wallaby.localProjectDir, 'test')
    : __dirname;
function fixture(fileName) {
  return path.join(workingFolder, 'fixtures', fileName);
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
  vue: Lang.VUE,
  svelte: Lang.SVELTE
}

function importCost(fileName, language = null, config = DEFAULT_CONFIG) {
  if (!language) {
    const extension = fileName.split('.').pop();
    language = LANGUAGES[extension];
  }
  return runner(fileName, fs.readFileSync(fileName, 'utf-8'), language, config);
}

function sizeOf(packages, name) {
  return packages.filter(x => x.name === name).shift().size;
}

function gzipOf(packages, name) {
  return packages.filter(x => x.name === name).shift().gzip;
}

function getPackages(fileName) {
  return whenDone(importCost(fixture(fileName)));
}

async function test(fileName, pkg = 'chai', minSize = 10000, maxSize = 15000, gzipLowBound = 0.01, gzipHighBound = 0.8) {
  const packages = await getPackages(fileName);
  const size = sizeOf(packages, pkg);
  expect(size).to.be.within(minSize, maxSize);
  expect(gzipOf(packages, pkg)).to.be.within(
    size * gzipLowBound,
    size * gzipHighBound
  );
}

async function timed(fn) {
  const time = process.hrtime();
  await fn();
  const diff = process.hrtime(time);
  return Math.round((diff[0] * 1e9 + diff[1]) / 1e6);
}

describe('importCost', () => {
  beforeEach(() => clearSizeCache());
  afterEach(() => clearSizeCache());
  afterEach(() => cleanup());

  // it.only('local file', async () => {
  //   const result = await whenDone(importCost(path.join(workingFolder, 'index.spec.js'), JAVASCRIPT));
  //   console.log(result[0].error);
  //   debugger;
  // });

  it('calculates size of require in javascript', () => test('require.js'));
  it('calculates size of require in typescript', () => test('require.ts'));
  it('calculates size of template require in javascript', () =>
    test('require-template.js'));
  it('calculates size of template require in typescript', () =>
    test('require-template.ts'));
  it('calculates size of import in javascript', () => test('import.js'));
  it('calculates size of import in typescript', () => test('import.ts'));
  it('calculate size of imports in a file contaning typescript features not supportted by babel', () =>
    test('typescript-not-supported-features.ts'));
  it('calculates size of aliased import in javascript', () =>
    test('import-aliased.js'));
  it('calculates size of aliased import in typescript', () =>
    test('import-aliased.ts'));
  it('calculates size of import with no semicolon in typescript', () =>
    test('import-no-semicolon.ts'));
  it('calculates size of legacy import in javascript', () =>
    test('import-legacy.js'));
  it('calculates size of legacy import in typescript', () =>
    test('import-legacy.ts'));
  it('doesnt calculate size of node import in javascript', () =>
    test('import-node.js', 'node-stuff', 0, 0));
  it('calculates size of namespace import in javascript', () =>
    test('import-namespace.js'));
  // yoshi uses babel 6 which does not support shorthand react fragments <> </>
  // it('calculates size of imports in a file with shorthand react fragments', () =>
  //   test('react-fragments.jsx'));
  it('calculates size of namespace import in typescript', () =>
    test('import-namespace.ts'));
  it('calculates size of specifiers import in javascript', () =>
    test('import-specifiers.js'));
  it('calculates size of specifiers import in typescript', () =>
    test('import-specifiers.ts'));
  it('calculates size of mixed default+named import in javascript', () =>
    test('import-mixed.js'));
  it('calculates size of mixed default+named import in typescript', () =>
    test('import-mixed.ts'));
  it('calculates size of mixed default+global import in javascript', () =>
    test('import-global-mixed.js', 'react'));
  it('calculates size of mixed default+global import in typescript', () =>
    test('import-global-mixed.ts', 'react'));
  it('calculates size of cherry pick import in javascript', () =>
    test('import-cherry.js', 'chai/abc'));
  it('calculates size of cherry pick import in typescript', () =>
    test('import-cherry.ts', 'chai/abc'));
  it('calculates size of scoped import in javascript', () =>
    test('import-scoped.js', '@angular/core'));
  it('calculates size of scoped import in typescript', () =>
    test('import-scoped.ts', '@angular/core'));
  it('calculates size of scoped esm import in javascript', () =>
    test('import-scoped-esm.js', '@angular/core/esm'));
  it('calculates size of scoped esm import in typescript', () =>
    test('import-scoped-esm.ts', '@angular/core/esm'));
  it('calculates size of shaken import in javascript', () =>
    test('import-shaken.js', 'react', 200, 300));
  it('calculates size of shaken import in typescript', () =>
    test('import-shaken.ts', 'react', 200, 300));
  it('calculates size of production env import in javascript', () =>
    test('import-env.js', 'react-dom', 200, 300));
  it('calculates size of production env import in typescript', () =>
    test('import-env.ts', 'react-dom', 200, 300));
  it('calculates size without externals', () =>
    test('import-externals.js', 'wix-style', 200, 300));
  it('calculates size without peerDependencies', () =>
    test('import-peer.js', 'haspeerdeps', 200, 300));
  it('supports a monorepo-like structure', () =>
    test('./yarn-workspace/import-nested-project.js', 'chai'));
  it('supports a monorepo-like structure with scoped module', () =>
    test('./yarn-workspace/import-with-scope.js', '@angular/core'));
  it('supports a monorepo-like structure with scoped module and file name', () =>
    test(
      './yarn-workspace/import-with-scope-filename.js',
      '@angular/core/index.js'
    ));
  it('calculates size of a dynamic import in javascript', () =>
    test('dynamic-import.js'));
  it('calculates size of a dynamic import in typescript', () =>
    test('dynamic-import.ts'));
  it('calculates size of a vue script', () =>
    test('vue.vue'));
  it('calculates size of a svelte script', () =>
    test('svelte.svelte'));

  it('caches the results import string & version', async () => {
    expect(await timed(() => test('import.js'))).to.be.within(100, 1500);
    expect(await timed(() => test('import-specifiers.js'))).to.be.within(
      100,
      1500
    );
    expect(await timed(() => test('import.ts'))).to.be.within(0, 100);
  });
  it('ignores order of javascript imports for caching purposes', async () => {
    expect(await timed(() => test('import-specifiers.js'))).to.be.within(
      100,
      1500
    );
    expect(
      await timed(() => test('import-specifiers-reversed.js'))
    ).to.be.within(0, 100);
    expect(await timed(() => test('import-mixed.js'))).to.be.within(100, 1500);
    expect(await timed(() => test('import-mixed-reversed.js'))).to.be.within(
      0,
      120
    );
  });
  it('ignores order of typescript imports for caching purposes', async () => {
    expect(await timed(() => test('import-specifiers.ts'))).to.be.within(
      100,
      1500
    );
    expect(
      await timed(() => test('import-specifiers-reversed.ts'))
    ).to.be.within(0, 100);
    expect(await timed(() => test('import-mixed.ts'))).to.be.within(100, 1500);
    expect(await timed(() => test('import-mixed-reversed.ts'))).to.be.within(
      0,
      100
    );
  });
  it('debounce any consecutive calculations of same import line', () => {
    const p1 = expect(
      whenDone(
        runner(
          fixture('import.js'),
          'import "chai";',
          LANGUAGES.js,
          DEFAULT_CONFIG
        )
      )
    ).to.be.rejectedWith(DebounceError);
    const p2 = expect(
      whenDone(
        runner(
          fixture('import.js'),
          'import "chai/index";',
          LANGUAGES.js,
          DEFAULT_CONFIG
        )
      )
    ).to.be.fulfilled;
    return Promise.all([p1, p2]);
  });
  it('caches everything to filesystem', async () => {
    expect(await timed(() => test('import.js'))).to.be.within(100, 1500);
    expect(await timed(() => test('import-specifiers.js'))).to.be.within(
      100,
      1500
    );
    fs.renameSync(cacheFileName, `${cacheFileName}.bak`);
    clearSizeCache();
    fs.renameSync(`${cacheFileName}.bak`, cacheFileName);
    expect(await timed(() => test('import.ts'))).to.be.within(0, 100);
  });

  it('results in 0 if dependency is missing', async () => {
    const packages = await whenDone(importCost(fixture('failed-missing.js')));
    expect(sizeOf(packages, 'sinon')).to.equal(0);
  });
  it('results in 0 if bundle fails', async () => {
    const packages = await whenDone(importCost(fixture('failed-bundle.js')));
    expect(sizeOf(packages, 'jest')).to.equal(0);
  });

  it('errors on broken javascript', () => {
    return expect(whenDone(importCost(fixture('incomplete.bad.js')))).to.be
      .rejected;
  });
  it('errors on broken typescript', () => {
    return expect(whenDone(importCost(fixture('incomplete.bad.ts')))).to.be
      .rejected;
  });
  it('errors on broken vue', () => {
    return expect(whenDone(importCost(fixture('incomplete.bad.vue')))).to.be
      .rejected;
  });
  it('completes with empty array for unknown file type', async () => {
    const packages = await whenDone(importCost(fixture('require.js'), 'flow'));
    expect(packages).to.eql([]);
  });

  it('should handle timeouts gracefully', async () => {
    const packages = await whenDone(
      importCost(fixture('require.js'), LANGUAGES.js, {
        concurrent: true,
        maxCallTime: 10,
      })
    );
    expect(packages[0].size).to.equal(0);
    expect(packages[0].error.type).to.equal('TimeoutError');
  });
});
