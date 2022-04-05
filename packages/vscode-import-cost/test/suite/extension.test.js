const { expect } = require('chai');
const { workspace, window, extensions, Uri } = require('vscode');
const path = require('path');

function whenDone(emitter, pkg) {
  return new Promise(resolve => {
    emitter.onLog(log => {
      if (log.startsWith('Calculated: ')) {
        const calculated = JSON.parse(log.replace('Calculated: ', ''));
        if (calculated.name === pkg) resolve(calculated);
      }
    });
  });
}

async function importCost(fileName) {
  const doc = await workspace.openTextDocument(fixture(fileName));
  await window.showTextDocument(doc);
  await extensions.getExtension('wix.vscode-import-cost').activate();
  return extensions.getExtension('wix.vscode-import-cost').exports.logger;
}

async function verify(
  fileName,
  pkg = 'chai',
  minSize = 10000,
  maxSize = 15000,
  gzipLowBound = 0.01,
  gzipHighBound = 0.8,
) {
  const { size, gzip } = await whenDone(await importCost(fileName), pkg);
  expect(size).to.be.within(minSize, maxSize);
  expect(gzip).to.be.within(size * gzipLowBound, size * gzipHighBound);
}

function fixture(fileName) {
  const scheme = workspace.workspaceFolders?.[0]?.uri.scheme || 'file';
  const base = scheme === 'file' ? process.env.CWD : '/';
  const uri = Uri.file(
    path.resolve(base, 'packages/import-cost/test/fixtures', fileName),
  ).with({ scheme });
  return uri;
}

describe('Import Cost VSCode Extension', () => {
  it('Should report module bundle size', () => {
    return verify('require.js');
  });
});
