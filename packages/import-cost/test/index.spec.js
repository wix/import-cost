/* global wallaby */
import fs from 'fs';
import path from 'path';
import {expect} from 'chai';
import {importCost as runner, cleanup, JAVASCRIPT, TYPESCRIPT} from '../src';
import {clearSizeCache, cacheFileName} from '../src/packageInfo';
import {DebounceError} from '../src/debouncePromise';

const workingFolder = typeof wallaby !== 'undefined' ? path.join(wallaby.localProjectDir, 'test') : __dirname;
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

function importCost(fileName, language = undefined) {
  language = language ? language : fileName.split('.').pop() === 'js' ? JAVASCRIPT : TYPESCRIPT;
  return runner(fileName, fs.readFileSync(fileName, 'utf-8'), language);
}

function sizeOf(packages, name) {
  return packages.filter(x => x.name === name).shift().size;
}

function gzipOf(packages, name) {
  return packages.filter(x => x.name === name).shift().gzip;
}

async function test(fileName, pkg = 'chai', minSize = 10000, maxSize = 15000) {
  const packages = await whenDone(importCost(fixture(fileName)));
  expect(sizeOf(packages, pkg)).to.be.within(minSize, maxSize);
  expect(gzipOf(packages, pkg)).to.be.within(sizeOf(packages, pkg) / 50, sizeOf(packages, pkg) / 1.5);
}

async function timed(fn) {
  const time = process.hrtime();
  await fn();
  const diff = process.hrtime(time);
  return Math.round(((diff[0] * 1e9) + diff[1]) / 1e6);
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
  it('calculates size of template require in javascript', () => test('require-template.js'));
  it('calculates size of template require in typescript', () => test('require-template.ts'));
  it('calculates size of import in javascript', () => test('import.js'));
  it('calculates size of import in typescript', () => test('import.ts'));
  it('calculates size of aliased import in javascript', () => test('import-aliased.js'));
  it('calculates size of aliased import in typescript', () => test('import-aliased.ts'));
  it('calculates size of import with no semicolon in typescript', () => test('import-no-semicolon.ts'));
  it('calculates size of legacy import in javascript', () => test('import-legacy.js'));
  it('calculates size of legacy import in typescript', () => test('import-legacy.ts'));
  it('calculates size of node import in javascript', () => test('import-node.js', 'node-stuff'));
  it('calculates size of namespace import in javascript', () => test('import-namespace.js'));
  it('calculates size of namespace import in typescript', () => test('import-namespace.ts'));
  it('calculates size of specifiers import in javascript', () => test('import-specifiers.js'));
  it('calculates size of specifiers import in typescript', () => test('import-specifiers.ts'));
  it('calculates size of mixed import in javascript', () => test('import-mixed.js'));
  it('calculates size of mixed import in typescript', () => test('import-mixed.ts'));
  it('calculates size of cherry pick import in javascript', () => test('import-cherry.js', 'chai/abc'));
  it('calculates size of cherry pick import in typescript', () => test('import-cherry.ts', 'chai/abc'));
  it('calculates size of scoped import in javascript', () => test('import-scoped.js', '@angular/core'));
  it('calculates size of scoped import in typescript', () => test('import-scoped.ts', '@angular/core'));
  it('calculates size of shaken import in javascript', () => test('import-shaken.js', 'react', 500, 1000));
  it('calculates size of shaken import in typescript', () => test('import-shaken.ts', 'react', 500, 1000));
  it('calculates size of production env import in javascript', () => test('import-env.js', 'react-dom', 500, 1000));
  it('calculates size of production env import in typescript', () => test('import-env.ts', 'react-dom', 500, 1000));
  it('calculates size without externals', () => test('import-externals.js', 'wix-style', 500, 1000));
  it('calculates size without peerDependencies', () => test('import-peer.js', 'haspeerdeps', 0, 1000));

  it('caches the results import string & version', async () => {
    expect(await timed(() => test('import.js'))).to.be.within(100, 1500);
    expect(await timed(() => test('import-specifiers.js'))).to.be.within(100, 1500);
    expect(await timed(() => test('import.ts'))).to.be.within(0, 100);
  });
  it('debounce any consecutive calculations of same import line', () => {
    const p1 = expect(whenDone(runner(fixture('import.js'), 'import "chai";', JAVASCRIPT))).to.be.rejectedWith(DebounceError);
    const p2 = expect(whenDone(runner(fixture('import.js'), 'import "chai/index";', JAVASCRIPT))).to.be.fulfilled;
    return Promise.all([p1, p2]);
  });
  it('caches everything to filesystem', async () => {
    expect(await timed(() => test('import.js'))).to.be.within(100, 1500);
    expect(await timed(() => test('import-specifiers.js'))).to.be.within(100, 1500);
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
    return expect(whenDone(importCost(fixture('incomplete.bad_js')))).to.be.rejected;
  });
  it('errors on broken typescript', () => {
    return expect(whenDone(importCost(fixture('incomplete.bad_ts')))).to.be.rejected;
  });
  it('completes with empty array for unknown file type', async () => {
    const packages = await whenDone(importCost(fixture('require.js'), 'flow'));
    expect(packages).to.eql([]);
  });
});
