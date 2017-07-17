import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';
import * as MemoryFS from 'memory-fs';
import * as UglifyJSPlugin from 'uglifyjs-webpack-plugin';
import { workspace } from 'vscode';
import logger from './logger';
export const BASE_PATH = `${workspace.rootPath}/.importcost`;
const cacheFile = `${BASE_PATH}/cache`;
let sizeCache = {};
loadSizeCache();

function loadSizeCache() {
  try {
    if (fs.existsSync(cacheFile)) {
      sizeCache = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    }
  } catch (e) {
    logger.log('Failed to load cache from file:' + e);
  }
}

function saveSizeCache() {
  try {
    fs.writeFileSync(cacheFile, JSON.stringify(sizeCache, null, 2), 'utf-8');
  } catch (e) {
    logger.log('Failed to write cache to file:' + e);
  }
}

export function getSizes(packages, decorate) {
  const sizes = Object.keys(packages)
    .filter(packageName => isPackageInstalledInProject(packageName))
    .map(async packageName => {
      const key = packages[packageName].string;
      if (!sizeCache[key]) {
        logger.log('decorating "calculating" for ' + packageName);
        decorate(packages[packageName]);
        try {
          sizeCache[key] = await getPackageSize(packages[packageName]);
          logger.log('got size successfully');
        } catch (e) {
          logger.log('couldnt calculate size');
          sizeCache[key] = 0;
        }
      }
      return { name: packageName, size: sizeCache[key] };
    });
  saveSizeCache();
  return sizes;
}

function getPackageSize(packageInfo) {
  return new Promise((resolve, reject) => {
    const entryPoint = getEntryPoint(packageInfo);
    const compiler = webpack(
      {
        entry: entryPoint,
        plugins: [new UglifyJSPlugin()]
      },
      (err, stats) => {
        removeTempFile(entryPoint);
        if (err) {
          logger.log('received error in webpack compilations: ' + err);
          reject(err);
        }
        const size = Math.round(stats.toJson().assets[0].size / 1024);
        logger.log('size is: ' + size);
        resolve(size);
      }
    );
    (compiler as webpack.Compiler).outputFileSystem = new MemoryFS();
  });
}

function getEntryPoint(packageInfo) {
  const fileName = `${BASE_PATH}/${packageInfo.name.replace(/\//g, '-')}-import-cost-temp.js`;
  fs.writeFileSync(fileName, packageInfo.string, 'utf-8');
  logger.log('creating entrypoint file:' + fileName + '|' + packageInfo.string);
  return fileName;
}

function removeTempFile(fileName) {
  logger.log('removing file:' + fileName);
  fs.unlinkSync(fileName);
}

function isPackageInstalledInProject(packageName: string): boolean {
  try {
    const packageRootPath = `${workspace.rootPath}/node_modules/${packageName}`;
    logger.log('package root path:' + packageRootPath);
    // example: require('vscode/lib/testrunner')
    if (packageName.split(/\//).length > 1) {
      const exists = fs.existsSync(`${packageRootPath}.js`);
      logger.log('package is a sub module:' + packageName + '|' + exists);
      return exists;
    }
    const packageJson = JSON.parse(fs.readFileSync(`${packageRootPath}/package.json`, 'utf-8'));
    const mainFilePath = path.resolve(packageRootPath, packageJson.main || 'index.js');
    const exists = fs.existsSync(mainFilePath);
    logger.log('looking for the package main file:' + mainFilePath + '|' + exists);
    return exists;
  } catch (e) {
    logger.log('failed to check if the package is installed in the project, returning false');
    return false;
  }
}
