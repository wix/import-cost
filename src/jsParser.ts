import {traverse} from 'babel-core';
import * as t from 'babel-types';
import {parse as jsParse} from 'babylon';
import logger from './logger';

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

export function getPackages(fileName, source) {
  const packages = [];
  const visitor = {
    ImportDeclaration(path) {
      packages.push({
        fileName,
        name: path.node.source.value,
        line: path.node.loc.end.line,
        string: compileImportString(path.node)
      });
      logger.log('found import declaration:' + packages[packages.length - 1].string);
    },
    CallExpression(path) {
      if (path.node.callee.name === 'require') {
        packages.push({
          fileName,
          name: path.node.arguments[0].value,
          line: path.node.loc.end.line,
          string: compileRequireString(path.node)
        });
        logger.log('found require expression:' + packages[packages.length - 1].string);
      }
    }
  };

  logger.log('parsing AST');
  const ast = parse(source);
  logger.log('ast parsed');
  logger.log('traversing AST');
  traverse(ast, visitor);
  logger.log('AST traversed');

  return packages;
}

function parse(source) {
  return jsParse(source, {
    sourceType: 'module',
    plugins: PARSE_PLUGINS
  });
}

function compileImportString(node) {
  let importString = 'import';
  let startedImportSpecifiers = false;
  if (node.specifiers && node.specifiers.length > 0) {
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
        if (node.specifiers[i + 1] && t.isImportSpecifier(node.specifiers[i + 1])) {
          importString += `, `;
        } else {
          importString += `}`;
        }
      }
    });
  } else {
    importString += ' tmp';
  }
  importString += ` from '${node.source.value}';`;
  return importString;
}

function compileRequireString(node) {
  return `require('${node.arguments[0].value}')`;
}
