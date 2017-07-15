import { traverse } from 'babel-core';
import { parse } from 'babylon';
import * as t from 'babel-types';

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
// TODO: make this more robust
function isLocalImport(name) {
  return name.indexOf('.') === 0;
}
export function getPackages(source) {
  const packages = {};
  const visitor = {
    ImportDeclaration(path) {
      if (!isLocalImport(path.node.source.value)) {
        packages[path.node.source.value] = {
          name: path.node.source.value,
          line: path.node.loc.end.line,
          node: path.node,
          string: compileImportString(path.node)
        };
      }
    },
    CallExpression(path) {
      if (path.node.callee.name === 'require' && !isLocalImport(path.node.arguments[0].value)) {
        packages[path.node.arguments[0].value] = {
          name: path.node.arguments[0].value,
          line: path.node.loc.end.line,
          node: path.node,
          string: compileRequireString(path.node)
        };
      }
    }
  };
  const ast = parse(source, {
    sourceType: 'module',
    plugins: PARSE_PLUGINS
  });
  traverse(ast, visitor);
  console.log('packages', packages);
  return packages;
}

function compileImportString(node) {
  let importString = 'import';
  let startedImportSpecifiers = false;
  if (node.specifiers) {
    node.specifiers.map((specifier, i) => {
      if (t.isImportNamespaceSpecifier(specifier)) {
        importString += ` * as ${specifier.local.name}`;
      } else if (t.isImportDefaultSpecifier(specifier)) {
        importString += ` ${specifier.local.name}`;
      } else if (t.isImportSpecifier(specifier)) {
        if (!startedImportSpecifiers) {
          importString += ` {`;
          startedImportSpecifiers = true;
        }
        importString += `${specifier.imported.name}`;
        if (node.specifiers[i + 1] && t.isImportDeclaration(node.specifiers[i + 1])) {
          importString += `, `;
        } else {
          importString += `}`;
        }
      }
    });
  }
  importString += ` from '${node.source.value}';`;
  return importString;
}

function compileRequireString(node) {
  return `require('${node.arguments[0].value}')`;
}
