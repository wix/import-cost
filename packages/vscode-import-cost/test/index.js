const { runTests: runElectronTests } = require('@vscode/test-electron');
const { runTests: runWebTests } = require('@vscode/test-web');
const path = require('path');

async function main() {
  await runElectronTests({
    extensionDevelopmentPath: path.resolve(__dirname, '../'),
    extensionTestsPath: path.resolve(__dirname, './runner/electron'),
  });
  await runWebTests({
    browserType: 'chromium',
    folderPath: path.resolve(__dirname, '../../../'),
    extensionDevelopmentPath: path.resolve(__dirname, '../'),
    extensionTestsPath: path.resolve(__dirname, '../dist/tests'),
  });
  process.exit(0);
}

main().catch(() => process.exit(1));
