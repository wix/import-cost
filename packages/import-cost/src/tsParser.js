import ts from 'typescript';

export function getPackages(fileName, source) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2016, true);
  const packages = gatherPackages(sourceFile).map(pkg => ({...pkg, fileName}));
  return packages;
}

function gatherPackages(sourceFile) {
  const packages = [];
  gatherPackagesFromNode(sourceFile);

  function gatherPackagesFromNode(node) {
    if (node.kind === ts.SyntaxKind.ImportDeclaration) {
      const importNode = node;
      const packageInfo = {
        name: importNode.moduleSpecifier.text,
        line: sourceFile.getLineAndCharacterOfPosition(importNode.getStart()).line + 1,
        string: importNode.getText()
      };

      const importClause = importNode.importClause && importNode.importClause.getText().replace('* as ', '');
      if (importClause) {
        packageInfo.string += `\nconsole.log(${importClause});`;
      }

      packages.push(packageInfo);
    } else if (node.kind === ts.SyntaxKind.CallExpression) {
      const callExpressionNode = node;
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
