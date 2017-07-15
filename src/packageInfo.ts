const sizeCache = {};
import * as fs from 'fs';
import * as webpack from 'webpack';
import * as MemoryFS from 'memory-fs';
import * as UglifyJSPlugin from 'uglifyjs-webpack-plugin';
import { workspace } from 'vscode';

export function getSizes(packages) {
  const sizes = Object.keys(packages).map(async packageName => {
    if (!sizeCache[packageName]) {
      sizeCache[packageName] = await getPackageSize(packages[packageName]);
    }
    return { name: packageName, size: sizeCache[packageName] };
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
  const fileName = `${workspace.rootPath}/${packageInfo.name.replace(/\//g, '-')}-size-temp.js`;
  fs.writeFileSync(fileName, packageInfo.string, 'utf-8');
  return fileName;
}

function removeTempFile(fileName) {
  fs.unlinkSync(fileName);
}
