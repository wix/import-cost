const { expect } = require('chai');
const { workspace, extensions } = require('vscode');

function whenDone(emitter) {
  return new Promise((resolve, reject) => {
    const calculated = [];
    emitter.onLog(log => {
      if (log.startsWith('Calculated: ')) {
        calculated.push(JSON.parse(log.replace('Calculated: ', '')));
        if (calculated[calculated.length - 1].error) reject(log);
      }
      if (
        log.startsWith('Setting decorations:') &&
        !log.includes('Calculating...')
      ) {
        resolve(calculated);
      }
    });
  });
}

async function importCost(fixture, language = 'javascript') {
  await workspace.openTextDocument({ content: fixture, language });
  await extensions.getExtension('wix.vscode-import-cost').activate();
  return extensions.getExtension('wix.vscode-import-cost').exports.logger;
}

function sizeOf(packages, name) {
  return packages.filter(x => x.name === name).shift().size;
}

function gzipOf(packages, name) {
  return packages.filter(x => x.name === name).shift().gzip;
}

async function getPackages(fixture) {
  return whenDone(await importCost(fixture));
}

async function verify(
  fixture,
  pkg = 'chai',
  minSize = 10000,
  maxSize = 15000,
  gzipLowBound = 0.01,
  gzipHighBound = 0.8,
) {
  const packages = await getPackages(fixture);
  const size = sizeOf(packages, pkg);
  expect(size).to.be.within(minSize, maxSize);
  expect(gzipOf(packages, pkg)).to.be.within(
    size * gzipLowBound,
    size * gzipHighBound,
  );
}

describe('Import Cost VSCode Extension', () => {
  it('Should report module bundle size', () =>
    verify('const fileSize = require("filesize");\n', 'filesize', 2000, 3000));
});
