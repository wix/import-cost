const mocha = require('mocha/mocha');
function run() {
  return new Promise((c, e) => {
    mocha.setup({ ui: 'bdd', timeout: 10000, reporter: undefined });
    require('../suite/extension.test.js');
    mocha.run(failures => (failures > 0 ? e(new Error('Tests failed')) : c()));
  });
}
module.exports = { run };
