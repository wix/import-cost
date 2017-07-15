import { ExtensionContext, commands, window, Range, Position, workspace } from 'vscode';
import { getPackages } from './parser';
import { decorate, createRawDecoration } from './decorator';
import { getSizes } from './packageInfo';

export function activate(context: ExtensionContext) {
  window.onDidChangeActiveTextEditor(async event => {
    if (event && event.document) {
      const packagesNameToLocation = getPackages(event.document.getText());
      const packageSizes = await Promise.all(getSizes(packagesNameToLocation));
      packageSizes.forEach(packageInfo => {
        decorate(
          createRawDecoration(packageInfo.size.toString() + 'KB', packagesNameToLocation[packageInfo.name].line)
        );
      });
    }
  });
}
export function deactivate() {}
