import { ExtensionContext, commands, window, Range, Position, workspace } from 'vscode';
import { getPackages } from './parser';
import { decorate } from './decorator';
import { getSizes } from './packageInfo';

export function activate(context: ExtensionContext) {
  workspace.onDidSaveTextDocument(decoratePackages);
  window.onDidChangeActiveTextEditor(decoratePackages);
  decoratePackages();
}

async function decoratePackages() {
  const editor = window.activeTextEditor;
  if (editor && editor.document) {
    try {
      const packagesNameToLocation = getPackages(editor.document.getText());
      const packageSizes = await Promise.all(
        getSizes(packagesNameToLocation, packageInfo =>
          decorate('Calculating...', packageInfo.line, editor.document.fileName)
        )
      );
      packageSizes.forEach(packageInfo => {
        decorate(
          packageInfo.size.toString() + 'KB',
          packagesNameToLocation[packageInfo.name].line,
          editor.document.fileName
        );
      });
    } catch (e) {
      // silent failure
    }
  }
}
export function deactivate() {}
