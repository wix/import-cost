/* global wallaby */
import fs from 'fs';
import path from 'path';
import {expect} from 'chai';
import {importCost as runner, cleanup, JAVASCRIPT, TYPESCRIPT} from '../src';
import {clearSizeCache} from '../src/packageInfo';

function fixture(fileName) {
  const workingFolder = typeof wallaby !== 'undefined' ? path.join(wallaby.localProjectDir, 'test') : __dirname;
  return path.join(workingFolder, 'fixtures', fileName);
}

function whenDone(emitter) {
  return new Promise(resolve => emitter.on('done', resolve));
}

function importCost(fileName) {
  const language = fileName.split('.').pop() === 'js' ? JAVASCRIPT : TYPESCRIPT;
  return runner(fileName, fs.readFileSync(fileName, 'utf-8'), language);
}

function sizeOf(packages, name) {
  return packages.filter(x => x.name === name).shift().size;
}

async function test(fileName) {
  const packages = await whenDone(importCost(fixture(fileName)));
  expect(sizeOf(packages, 'chai')).to.be.greaterThan(500);
}

describe('importCost', () => {
  beforeEach(() => clearSizeCache());
  afterEach(() => clearSizeCache());
  afterEach(() => cleanup());

  it('calculates size of require in javascript', () => test('require.js'));
  it('calculates size of require in typescript', () => test('require.ts'));
  it('calculates size of template require in javascript', () => test('require-template.js'));
  it('calculates size of template require in typescript', () => test('require-template.ts'));
  it('calculates size of import in javascript', () => test('import.js'));
  it('calculates size of import in typescript', () => test('import.ts'));
  it('calculates size of legacy import in javascript', () => test('import-legacy.js')); //not supported in typescript
  it('calculates size of namespace import in javascript', () => test('import-namespace.js'));
  it('calculates size of namespace import in typescript', () => test('import-namespace.ts'));
  it('calculates size of specifiers import in javascript', () => test('import-specifiers.js'));
  it('calculates size of specifiers import in typescript', () => test('import-specifiers.ts'));
  it('calculates size of mixed import in javascript', () => test('import-mixed.js'));
  it('calculates size of mixed import in typescript', () => test('import-mixed.ts'));

  it('calculates size of mixed import in javascript', async () => {
    const fileName = fixture('import-mixed.js');
    const packages = await whenDone(importCost(fileName));
    expect(sizeOf(packages, 'chai')).to.be.greaterThan(500);
  });
});
