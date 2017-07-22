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
    workspace.onDidChangeTextDocument(ev => processActiveFile(ev.document));
    window.onDidChangeActiveTextEditor(ev => ev && processActiveFile(ev.document));
    if (window.activeTextEditor) {
      processActiveFile(window.activeTextEditor.document);
    }
  } catch (e) {
    logger.log('wrapping error: ' + e);
  }
}

async function processActiveFile(document) {
  console.log(document.fileName);
  if (document) {
    try {
      logger.log('triggered ' + Date.now());
      logger.log('### getting packages');
      const packagesNameToLocation = getPackages(document.fileName, document.getText());
      logger.log('### getting sizes');
      const promises = Object.keys(packagesNameToLocation).map(packageName => {
        const packageInfo = packagesNameToLocation[packageName];
        calculating(packageInfo);
        return getSize(packageInfo);
      }).map(promise => promise.then(packageInfo => {
        const pkgCheck = getPackages(document.fileName, document.getText());
        const pkgString = pkgCheck[packageInfo.name] && pkgCheck[packageInfo.name].string;
        if (pkgString === packageInfo.string) {
          calculated(packageInfo);
          return packageInfo;
        }
      }));
      const packages = (await Promise.all(promises)).filter(x => x);
      flushDecorations(document.fileName, packages);
    } catch (e) {
      logger.log('decoratePackages error:' + e);
    }
  }
}
export function deactivate() {}
