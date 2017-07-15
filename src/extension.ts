import { ExtensionContext, commands, window, Range, Position, workspace } from 'vscode';
import * as fs from 'fs';
import * as webpack from 'webpack';
import * as webpackMiddleware from 'webpack-dev-middleware';
import * as MemoryFS from 'memory-fs';
import { traverse } from 'babel-core';
import { parse } from 'babylon';
import * as UglifyJSPlugin from 'uglifyjs-webpack-plugin';

const sizeCache = {};

export function activate(context: ExtensionContext) {
  window.onDidChangeActiveTextEditor(async event => {
    if (event && event.document) {
      const packagesNameToLocation = getPackages(event.document.getText());
      const packageSizes = await Promise.all(getSizes(packagesNameToLocation));
      packageSizes.forEach(packageInfo => {
        decorate(createRawDecoration(packageInfo.size.toString() + 'KB', packagesNameToLocation[packageInfo.name]));
      });
    }
  });
}
export function deactivate() {}

function decorate(decoration) {
  window.activeTextEditor.setDecorations(decoration.decoration, [decoration.range]);
}

function createRawDecoration(text: string, line: number, color: string = '#C23B22') {
  const decoration = window.createTextEditorDecorationType({
    after: { color, contentText: text, margin: '0 0 0 1rem' }
  });
  const rangeMod = +Math.ceil(Math.random() * 1000);
  const range = new Range(new Position(line - 1, 1024 + rangeMod), new Position(line - 1, 1024 + rangeMod));
  return { decoration, range };
}

function getSizes(packages) {
  const sizes = Object.keys(packages).map(async packageName => {
    if (!sizeCache[packageName]) {
      sizeCache[packageName] = await getPackageSize(packageName);
    }
    return { name: packageName, size: sizeCache[packageName] };
  });
  return sizes;
}

function getPackageSize(packageName) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(
      {
        entry: getEntryPoint(packageName),
        plugins: [new UglifyJSPlugin()]
      },
      (err, stats) => {
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

function getEntryPoint(packageName: string) {
  const packageRoot = `${workspace.rootPath}/node_modules/${packageName}`;
  const packageJson = JSON.parse(fs.readFileSync(`${packageRoot}/package.json`, 'utf-8'));
  const main = packageJson.main || 'index.js';
  const entryPoint = `${packageRoot}/${main}`;
  return entryPoint;
}

function getPackages(source) {
  const PARSE_PLUGINS = [
    'jsx',
    'flow',
    'asyncFunctions',
    'classConstructorCall',
    'doExpressions',
    'trailingFunctionCommas',
    'objectRestSpread',
    'decorators',
    'classProperties',
    'exportExtensions',
    'exponentiationOperator',
    'asyncGenerators',
    'functionBind',
    'functionSent'
  ];

  const packages = {};
  const visitor = {
    ImportDeclaration(path) {
      if (path.node.source.value.indexOf('.') !== 0) {
        packages[path.node.source.value] = path.node.loc.end.line;
      }
    },
    CallExpression(path) {
      if (path.node.callee.name === 'require' && path.node.arguments[0].value.indexOf('.') !== 0) {
        packages[path.node.arguments[0].value] = path.node.loc.end.line;
      }
    }
  };
  const ast = parse(source, {
    sourceType: 'module',
    plugins: PARSE_PLUGINS
  });
  traverse(ast, visitor);
  return packages;
}
