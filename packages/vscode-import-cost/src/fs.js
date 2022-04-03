const { workspace } = require('vscode');
const { Buffer } = require('buffer');
const fs = { ...workspace.fs };
const scheme = () => workspace.workspaceFolders?.[0]?.uri.scheme || 'file';
fs.stat = uri => workspace.fs.stat(uri.with({ scheme: scheme() }));
fs.readFile = async uri =>
  new Buffer(await workspace.fs.readFile(uri.with({ scheme: scheme() })));
module.exports = fs;
