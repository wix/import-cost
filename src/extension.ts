import { ExtensionContext, commands, window, Range, Position, workspace } from 'vscode';
import { getPackages } from './parser';
import { decorate } from './decorator';
import { getSizes } from './packageInfo';
import logger from './logger';

export function activate(context: ExtensionContext) {
  try {
    logger.init(context);
    logger.log('starting...');
    workspace.onDidSaveTextDocument(decoratePackages);
    window.onDidChangeActiveTextEditor(decoratePackages);
    decoratePackages();
  } catch (e) {
    logger.log('wrapping error: ' + e);
  }
}

async function decoratePackages() {
  const editor = window.activeTextEditor;
  if (editor && editor.document) {
    try {
      logger.log('triggered ' + Date.now());
      logger.log('### getting packages');
      const packagesNameToLocation = getPackages(editor.document.fileName, editor.document.getText());
      logger.log('### getting sizes');
      const packageSizes = await Promise.all(
        getSizes(packagesNameToLocation, packageInfo =>
          decorate('Calculating...', packageInfo.line, editor.document.fileName)
        )
      );
      logger.log('### decorating');
      packageSizes.forEach(packageInfo => {
        if (packageInfo.size > 0) {
          decorate(
            packageInfo.size.toString() + 'KB',
            packagesNameToLocation[packageInfo.name].line,
            editor.document.fileName
          );
        }
      });
    } catch (e) {
      logger.log('decoratePackages error:' + e);
    }
  }
}
export function deactivate() {}
