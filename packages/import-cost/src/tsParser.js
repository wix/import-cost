import ts from 'typescript';

export function getPackages(fileName, source) {
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.ES2016, true);
  const packages = gatherPackages(sourceFile).map(pkg => ({...pkg, fileName}));
  return packages;
}

function gatherPackages(sourceFile) {
  const packages = [];
  gatherPackagesFromNode(sourceFile);

  function getNamedImports(namedBindings) {
    const namedImportElements = (namedBindings.elements || []);
    if (!namedImportElements.length) {
      throw new Error('NamedImports must have at east one element');
    }
    const namedImports = `{ ${namedImportElements.map(elem => (elem.propertyName || elem.name).text).sort().join(', ')} }`;
    return namedImports;
  }

  function gatherPackagesFromNode(node) {
    if (ts.isImportDeclaration(node)) {
      const importNode = node;
      const importClauses = [];
      if (importNode.importClause) {
        // Default import
        if (importNode.importClause.name) {
          importClauses.push(importNode.importClause.name.escapedText);
        }

        if (importNode.importClause.namedBindings) {
          if (ts.isNamespaceImport(importNode.importClause.namedBindings)) {
            // NamespaceImport: * as <varname>
            importClauses.push(`* as ${importNode.importClause.namedBindings.name.escapedText}`);
          } else if (ts.isNamedImports(importNode.importClause.namedBindings)) {
            const namedImports = getNamedImports(importNode.importClause.namedBindings);
            importClauses.push(namedImports);
          } else {
            throw new Error(`Unknown named binding kind ${importNode.importClause.namedBindings.kind}`);
          }
        } else if (!importClauses.length) {
          // Unnamed imports are unknown; just calculate the size of the default import?
          importClauses.push('tmp');
        }
      }
      let importStatement;
      if (importClauses.length > 0) {
        const importClauseText = importClauses.join(', ');
        const importPropertiesText = importClauses.map(clause => clause.replace(/^\* as /, '')).join(', ');
        importStatement = `import ${importClauseText} from '${importNode.moduleSpecifier.text}';\nconsole.log(${importPropertiesText});`;
      } else {
        importStatement = `import '${importNode.moduleSpecifier.text}';`;
      }

      const packageInfo = {
        fileName: sourceFile.fileName,
        name: importNode.moduleSpecifier.text,
        line: sourceFile.getLineAndCharacterOfPosition(importNode.getStart()).line + 1,
        string: importStatement
      };
      packages.push(packageInfo);
    } else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) &&
               node.moduleReference.expression && ts.isStringLiteral(node.moduleReference.expression)) {
      const packageName = node.moduleReference.expression.text;
      const packageInfo = {
        fileName: sourceFile.fileName,
        name: packageName,
        line: sourceFile.getLineAndCharacterOfPosition(node.moduleReference.getStart()).line + 1,
        string: `const aaa = require('${packageName}')`
      };
      packages.push(packageInfo);
    } else if (ts.isCallExpression(node)) {
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
