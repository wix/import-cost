import fs from 'fs';
import path from 'path';
import {expect} from 'chai';
import {importCost, JAVASCRIPT} from '../src';

describe('importCost', () => {
  it('should increment the counter by the provided number', done => {
    const fileName = path.join(__dirname, 'fixtures', 'a.js');
    const emitter = importCost(fileName, fs.readFileSync(fileName, 'utf-8'), JAVASCRIPT);
    emitter.on('done', packages => {
      expect(packages.filter(x => x.name === 'chai').shift().size).to.be.greaterThan(500);
      done();
    });
  });
});
