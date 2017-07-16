import * as fs from 'fs';
import * as path from 'path';
import * as webpack from 'webpack';
import * as MemoryFS from 'memory-fs';
import * as UglifyJSPlugin from 'uglifyjs-webpack-plugin';
import { workspace } from 'vscode';
const sizeCache = {};

export function getSizes(packages, decorate) {
  const sizes = Object.keys(packages)
    .filter(packageName => isPackageInstalledInProject(packageName))
    .map(async packageName => {
      const key = packages[packageName].string;
      if (!sizeCache[key]) {
        decorate(packages[packageName]);
        sizeCache[key] = await getPackageSize(packages[packageName]);
      }
      return { name: packageName, size: sizeCache[key] };
    });
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
          reject(err);
        }
        const size = Math.round(stats.toJson().assets[0].size / 1024);
        resolve(size);
      }
    );
    (compiler as webpack.Compiler).outputFileSystem = new MemoryFS();
  });
}

function getEntryPoint(packageInfo) {
  const basePath = `${workspace.rootPath}/.importcost`;
  if (!fs.existsSync(basePath)) {
    fs.mkdirSync(basePath);
  }
  const fileName = `${basePath}/${packageInfo.name.replace(/\//g, '-')}-import-cost-temp.js`;
  fs.writeFileSync(fileName, packageInfo.string, 'utf-8');
  return fileName;
}

function removeTempFile(fileName) {
  fs.unlinkSync(fileName);
}

function isPackageInstalledInProject(packageName: string): boolean {
  try {
    const packageRootPath = `${workspace.rootPath}/node_modules/${packageName}`;
    // require('vscode/lib/testrunner')
    if (packageName.split(/\//).length > 1) {
      return fs.existsSync(`${packageRootPath}.js`);
    }
    const packageJson = JSON.parse(fs.readFileSync(`${packageRootPath}/package.json`, 'utf-8'));
    const mainFilePath = path.resolve(packageRootPath, packageJson.main || 'index.js');
    return fs.existsSync(mainFilePath);
  } catch (e) {
    return false;
  }
}
