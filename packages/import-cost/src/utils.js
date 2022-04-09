const path = require('path');
const { URI } = require('vscode-uri');
const fsAdapter = require('native-fs-adapter');

async function pkgDir(directory) {
  const { root } = path.parse(directory);
  while (directory !== root) {
    try {
      await fsAdapter.stat(URI.file(path.resolve(directory, 'package.json')));
      return directory;
    } catch {
      directory = path.resolve(directory, '..');
    }
  }
}

async function parseJson(dir) {
  const pkg = path.join(dir, 'package.json');
  return JSON.parse(await fsAdapter.readFile(URI.file(pkg)));
}

function getPackageName(pkg) {
  const pkgParts = pkg.name.split('/');
  let pkgName = pkgParts.shift();
  if (pkgName.startsWith('@')) {
    pkgName = path.join(pkgName, pkgParts.shift());
  }
  return pkgName;
}

async function getPackageModuleContainer(pkg) {
  let currentDir = path.dirname(pkg.fileName);
  let foundDir = '';
  const pkgName = getPackageName(pkg);

  while (!foundDir) {
    const projectDir = await pkgDir(currentDir);
    if (!projectDir) {
      throw new Error(`Package directory not found [${pkg.name}]`);
    }
    const modulesDirectory = path.join(projectDir, 'node_modules');
    try {
      await fsAdapter.stat(URI.file(path.resolve(modulesDirectory, pkgName)));
      foundDir = modulesDirectory;
    } catch {
      currentDir = path.resolve(projectDir, '..');
    }
  }
  return foundDir;
}

async function getPackageDirectory(pkg) {
  const pkgName = getPackageName(pkg);
  const tmp = await getPackageModuleContainer(pkg);
  return path.resolve(tmp, pkgName);
}

async function getPackageVersion(pkg) {
  return `${getPackageName(pkg)}@${(await getPackageJson(pkg)).version}`;
}

async function getPackageJson(pkg) {
  return await parseJson(await getPackageDirectory(pkg));
}

module.exports = {
  getPackageModuleContainer,
  getPackageVersion,
  getPackageJson,
  pkgDir,
};
