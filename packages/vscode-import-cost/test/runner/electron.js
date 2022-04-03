const path = require('path');
const Mocha = require('mocha');
function run() {
  return new Promise((c, e) => {
    const mocha = new Mocha({ ui: 'bdd', color: true, timeout: 10000 });
    mocha.addFile(path.resolve(__dirname, '../suite/extension.test.js'));
    mocha.run(failures => (failures > 0 ? e(new Error('Tests failed')) : c()));
  });
}
module.exports = { run };
