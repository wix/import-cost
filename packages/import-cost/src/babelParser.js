import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { parse as jsParse } from '@babel/parser';
import { TYPESCRIPT } from './parser';

const PARSE_PLUGINS = [
  'jsx',
  'asyncFunctions',
  'classConstructorCall',
  'doExpressions',
  'trailingFunctionCommas',
  'objectRestSpread',
  ['decorators', { decoratorsBeforeExport: true }],
  'classProperties',
  'exportExtensions',
  'exponentiationOperator',
  'asyncGenerators',
  'functionBind',
  'functionSent',
  'dynamicImport',
];
const PARSE_JS_PLUGINS = ['flow', ...PARSE_PLUGINS];
const PARSE_TS_PLUGINS = ['typescript', ...PARSE_PLUGINS];

export function getPackages(fileName, source, language) {
  const packages = [];
  const visitor = {
    ImportDeclaration({ node }) {
      packages.push({
        fileName,
        name: node.source.value,
        line: node.loc.end.line,
        string: compileImportString(node),
      });
    },
    CallExpression({ node }) {
      if (node.callee.name === 'require') {
        packages.push({
          fileName,
          name: getPackageName(node),
          line: node.loc.end.line,
          string: compileRequireString(node),
        });
      } else if (node.callee.type === 'Import') {
        packages.push({
          fileName,
          name: getPackageName(node),
          line: node.loc.end.line,
          string: compileImportExpressionString(node),
        });
      }
    },
  };

  const ast = parse(source, language);
  traverse(ast, visitor);
  return packages;
}

function parse(source, language) {
  const plugins = language === TYPESCRIPT ? PARSE_TS_PLUGINS : PARSE_JS_PLUGINS;
  return jsParse(source, {
    sourceType: 'module',
    plugins,
  });
}

function compileImportString(node) {
  let importSpecifiers, importString;
  if (node.specifiers && node.specifiers.length > 0) {
    importString = []
      .concat(node.specifiers)
      .sort((s1, s2) => {
        // Import specifiers are in statement order, which for mixed imports must be either "defaultImport, * as namespaceImport"
        // or "defaultImport, { namedImport [as alias]... } according to current ECMA-262.
        // Given that two equivalent import statements can only differ in the order of the items in a NamedImports block,
        // we only need to sort these items in relation to each other to normalise the statements for caching purposes.
        // Where the node is anything other than ImportSpecifier (Babel terminoligy for NamedImports), preserve the original statement order.
        if (t.isImportSpecifier(s1) && t.isImportSpecifier(s2)) {
          return s1.imported.name < s2.imported.name ? -1 : 1;
        }
        return 0;
      })
      .map((specifier, i) => {
        if (t.isImportNamespaceSpecifier(specifier)) {
          return `* as ${specifier.local.name}`;
        } else if (t.isImportDefaultSpecifier(specifier)) {
          return specifier.local.name;
        } else if (t.isImportSpecifier(specifier)) {
          if (!importSpecifiers) {
            importSpecifiers = '{';
          }
          importSpecifiers += specifier.imported.name;
          if (
            node.specifiers[i + 1] &&
            t.isImportSpecifier(node.specifiers[i + 1])
          ) {
            importSpecifiers += ', ';
            return undefined;
          } else {
            const result = importSpecifiers + '}';
            importSpecifiers = undefined;
            return result;
          }
        } else {
          return undefined;
        }
      })
      .filter(x => x)
      .join(', ');
  } else {
    importString = '* as tmp';
  }
  return `import ${importString} from '${
    node.source.value
  }';\nconsole.log(${importString.replace('* as ', '')});`;
}

function compileRequireString(node) {
  return `require('${getPackageName(node)}')`;
}

function compileImportExpressionString(node) {
  return `import('${getPackageName(node)}').then(res => console.log(res));`;
}

function getPackageName(node) {
  return t.isTemplateLiteral(node.arguments[0])
    ? node.arguments[0].quasis[0].value.raw
    : node.arguments[0].value;
}
