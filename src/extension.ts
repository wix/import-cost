import * as fs from 'fs';
import { ExtensionContext, commands, window, Range, Position, workspace } from 'vscode';
import { getPackages } from './parser';
import { calculating, calculated, flushDecorations } from './decorator';
import { getSize } from './packageInfo';
import logger from './logger';

export function activate(context: ExtensionContext) {
  try {
    logger.init(context);
    logger.log('starting...');
    workspace.onDidSaveTextDocument(processActiveFile);
    workspace.onDidChangeTextDocument(processActiveFile);
    window.onDidChangeActiveTextEditor(processActiveFile);
    processActiveFile();
  } catch (e) {
    logger.log('wrapping error: ' + e);
  }
}

async function processActiveFile() {
  const editor = window.activeTextEditor;
  if (editor && editor.document) {
    try {
      logger.log('triggered ' + Date.now());
      logger.log('### getting packages');
      const packagesNameToLocation = getPackages(editor.document.fileName, editor.document.getText());
      logger.log('### getting sizes');
      const promises = Object.keys(packagesNameToLocation).map(packageName => {
        const packageInfo = packagesNameToLocation[packageName];
        calculating(packageInfo);
        return getSize(packageInfo);
      }).map(promise => promise.then(packageInfo => {
        const pkgCheck = getPackages(editor.document.fileName, editor.document.getText());
        const pkgString = pkgCheck[packageInfo.name] && pkgCheck[packageInfo.name].string;
        if (pkgString === packageInfo.string) {
          calculated(packageInfo);
          return packageInfo;
        }
      }));
      const packages = (await Promise.all(promises)).filter(x => x);
      flushDecorations(editor.document.fileName, packages);
    } catch (e) {
      logger.log('decoratePackages error:' + e);
    }
  }
}
export function deactivate() {}
