const { workspace } = require('vscode');
const { Buffer } = require('buffer');
const fs = { ...workspace.fs };
fs.readFile = async (...args) =>
  new Buffer(await workspace.fs.readFile(...args));
module.exports = fs;
