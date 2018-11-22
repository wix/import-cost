const fs = require('fs');
const path = require('path');
const pkgDir = require('pkg-dir');

function parseJson(dir) {
  const pkg = path.join(dir, 'package.json');
  return JSON.parse(fs.readFileSync(pkg, 'utf-8'));
}

function getPackageName(pkg) {
  const pkgParts = pkg.name.split('/');
  let pkgName = pkgParts.shift();
  if (pkgName.startsWith('@')) {
    pkgName = path.join(pkgName, pkgParts.shift());
  }
  return pkgName;
}

/**
 * @param {Object} pkg
 * @returns {string} The location of a node_modules folder containing this package.
 */
function getPackageModuleContainer(pkg) {
  let currentDir = path.dirname(pkg.fileName);
  let foundDir = '';
  const pkgName = getPackageName(pkg);

  while (!foundDir) {
    const projectDir = pkgDir.sync(currentDir);
    if (!projectDir) {
      throw new Error(`Package directory not found [${pkg.name}]`);
    }
    const modulesDirectory = path.join(projectDir, 'node_modules');
    if (fs.existsSync(path.resolve(modulesDirectory, pkgName))) {
      foundDir = modulesDirectory;
    } else {
      currentDir = path.resolve(currentDir, '..');
    }
  }
  return foundDir;
}

/**
 * @param {Object} pkg
 * @returns {string} The actual location on-disk for this package.
 */
function getPackageDirectory(pkg) {
  const pkgName = getPackageName(pkg);

  const tmp = getPackageModuleContainer(pkg);
  return path.resolve(tmp, pkgName);
}

function getPackageVersion(pkg) {
  return `${getPackageName(pkg)}@${getPackageJson(pkg).version}`;
}

function getPackageJson(pkg) {
  return parseJson(getPackageDirectory(pkg));
}

module.exports = {
  getPackageJson,
  getPackageModuleContainer,
  getPackageDirectory,
  getPackageVersion,
  parseJson,
};
