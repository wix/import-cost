import * as fs from 'fs';
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
    workspace.onDidChangeTextDocument(decoratePackages);
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
      return getSizes(packagesNameToLocation, packageInfo =>
        decorate('Calculating...', packageInfo)
      ).map(promise => promise.then(packageInfo =>
        decorate(packageInfo.size > 0 ? packageInfo.size.toString() + 'KB' : '', packageInfo)
      ));
    } catch (e) {
      logger.log('decoratePackages error:' + e);
    }
  }
}
export function deactivate() {}
