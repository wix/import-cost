const { expect } = require('chai');
const { workspace, window, extensions, env } = require('vscode');

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

async function importCost(content, language = 'javascript') {
  const doc = await workspace.openTextDocument({ content, language });
  await window.showTextDocument(doc);
  await extensions.getExtension('wix.vscode-import-cost').activate();
  return extensions.getExtension('wix.vscode-import-cost').exports.logger;
}

async function verify(
  fixture,
  pkg = 'chai',
  minSize = 10000,
  maxSize = 15000,
  gzipLowBound = 0.01,
  gzipHighBound = 0.8,
) {
  const { size, gzip } = await whenDone(await importCost(fixture), pkg);
  expect(size).to.be.within(minSize, maxSize);
  expect(gzip).to.be.within(size * gzipLowBound, size * gzipHighBound);
}

describe('Import Cost VSCode Extension', () => {
  it('Should report module bundle size', () =>
    verify(
      'const fileSize = require("filesize");\n',
      'filesize',
      env.appHost === 'desktop' ? 2000 : 3000,
      env.appHost === 'desktop' ? 3000 : 4000,
    ));
});
