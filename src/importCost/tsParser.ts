import * as ts from 'typescript';

export function getPackages(fileName, source) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2016, true);
  const packages = gatherPackages(sourceFile).map(pkg => ({...pkg, fileName}));
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
        string: `${importNode.getText()} console.log(${importNode.importClause.getText().replace('* as ', '')});`
      };
      packages.push(packageInfo);
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
      }
    }
    ts.forEachChild(node, gatherPackagesFromNode);
  }
  return packages;
}
