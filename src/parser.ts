import { traverse } from 'babel-core';
import * as t from 'babel-types';
import { parse as tsParse } from 'typescript-eslint-parser';
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

export function getPackages(source) {
  const packages = {};
  const visitor = {
    ImportDeclaration(path) {
      packages[path.node.source.value] = {
        name: path.node.source.value,
        line: path.node.loc.end.line,
        node: path.node,
        string: compileImportString(path.node)
      };
      logger.log('found import declaration:' + packages[path.node.source.value].string);
    },
    CallExpression(path) {
      if (path.node.callee.name === 'require') {
        packages[path.node.arguments[0].value] = {
          name: path.node.arguments[0].value,
          line: path.node.loc.end.line,
          node: path.node,
          string: compileRequireString(path.node)
        };
        logger.log('found require expression:' + packages[path.node.arguments[0].value].string);
      }
    }
  };
  logger.log('parsing AST');
  const ast = parse(source);
  logger.log('ast parsed');
  try {
    logger.log('traversing AST');
    traverse(ast, visitor);
    logger.log('AST traversed');
  } catch (e) {
    logger.log('error traversing AST:' + e);
  }
  logger.log('returning packages:' + JSON.stringify(packages, null, 2));
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
        if (node.specifiers[i + 1] && t.isImportSpecifier(node.specifiers[i + 1])) {
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

function parse(text) {
  const jsx = isProbablyJsx(text);
  let ast;
  try {
    // Try passing with our best guess first.
    ast = tryParseTypeScript(text, jsx);
  } catch (e) {
    // But if we get it wrong, try the opposite.
    ast = tryParseTypeScript(text, !jsx);
  }
  delete ast.tokens;
  return ast;
}

function tryParseTypeScript(text, jsx) {
  return tsParse(text, {
    loc: true,
    range: true,
    tokens: true,
    comment: true,
    useJSXTextNode: true,
    ecmaFeatures: { jsx },
    loggerFn: () => {}
  });
}

function isProbablyJsx(text) {
  return new RegExp(
    [
      '(^[^"\'`]*</)', // Contains "</" when probably not in a string
      '|',
      '(^[^/]{2}.*/>)' // Contains "/>" on line not starting with "//"
    ].join(''),
    'm'
  ).test(text);
}
