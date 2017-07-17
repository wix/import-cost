import * as ts from 'typescript';
import logger from './logger';

export function getPackages(filename, source) {
  logger.log('parsing AST');
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.ES2016, true);
  logger.log('ast parsed');
  logger.log('traversing AST');
  const packages = gatherPackages(sourceFile);
  logger.log('AST traversed');
  return packages;
}

function gatherPackages(sourceFile: ts.SourceFile) {
  const packages = {};
  gatherPackagesFromNode(sourceFile);

  function gatherPackagesFromNode(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.ImportDeclaration:
        const importNode: any = node;
        const packageInfo = (packages[importNode.moduleSpecifier.text] = {
          name: importNode.moduleSpecifier.text,
          line: sourceFile.getLineAndCharacterOfPosition(importNode.getStart()).line + 1,
          node: importNode,
          string: importNode.getText()
        });
        logger.log('found import declaration:' + packageInfo.string + '|' + packageInfo.line);
        break;
      case ts.SyntaxKind.CallExpression:
        const callExpressionNode: any = node;
        if (callExpressionNode.expression.text === 'require') {
          const packageName = callExpressionNode.arguments[0].text;
          const packageInfo = (packages[packageName] = {
            name: packageName,
            line: sourceFile.getLineAndCharacterOfPosition(callExpressionNode.getStart()).line + 1,
            node: callExpressionNode,
            string: callExpressionNode.getText()
          });
          logger.log('found import declaration:' + packageInfo.string + '|' + packageInfo.line);
        }
        break;
    }
    ts.forEachChild(node, gatherPackagesFromNode);
  }
  logger.log('returning packages:' + Object.keys(packages));
  return packages;
}
