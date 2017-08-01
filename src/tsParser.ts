import * as ts from 'typescript';
import logger from './logger';

export function getPackages(fileName, source) {
  logger.log('parsing AST');
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2016, true);
  logger.log('ast parsed');
  logger.log('traversing AST');
  const packages = gatherPackages(sourceFile).map(pkg => ({...pkg, fileName}));
  logger.log('AST traversed');
  return packages;
}

function gatherPackages(sourceFile: ts.SourceFile) {
  const packages = [];
  gatherPackagesFromNode(sourceFile);

  function gatherPackagesFromNode(node: ts.Node) {
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      const importNode: any = node;
      const packageInfo = {
        name: importNode.moduleSpecifier.text,
        line: sourceFile.getLineAndCharacterOfPosition(importNode.getStart()).line + 1,
        string: importNode.getText()
      };
      packages.push(packageInfo);
      logger.log('found import declaration:' + packageInfo.string + '|' + packageInfo.line);
    } else if (node.kind === ts.SyntaxKind.CallExpression) {
      const callExpressionNode: any = node;
      if (callExpressionNode.expression.text === 'require') {
        const packageName = callExpressionNode.arguments[0].text;
        const packageInfo = {
          fileName: sourceFile.fileName,
          name: packageName,
          line: sourceFile.getLineAndCharacterOfPosition(callExpressionNode.getStart()).line + 1,
          string: callExpressionNode.getText()
        };
        packages.push(packageInfo);
        logger.log('found import declaration:' + packageInfo.string + '|' + packageInfo.line);
      }
    }
    ts.forEachChild(node, gatherPackagesFromNode);
  }
  return packages;
}
