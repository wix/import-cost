import * as fs from 'fs';
import {DebounceError} from './debouncePromise';
import {ExtensionContext, commands, window, Range, Position, workspace} from 'vscode';
import {getPackages} from './parser';
import {calculating, calculated, flushDecorations} from './decorator';
import {getSize, cleanup} from './packageInfo';
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

export function deactivate() {
  cleanup();
}

let pendingCounter = {};

async function processActiveFile(document) {
  if (document) {
    pendingCounter[document.fileName] = pendingCounter[document.fileName] || 0;
    const currentCounter = ++pendingCounter[document.fileName];

    try {
      const imports = getPackages(document.fileName, document.getText());
      flushDecorations(document.fileName, []);
      const promises = imports
        .filter(packageInfo => !packageInfo.name.startsWith('.'))
        .map(packageInfo => {
          calculating(packageInfo);
          return getSize(packageInfo);
        })
        .map(promise => promise.then(packageInfo => {
          if (currentCounter === pendingCounter[document.fileName]) {
            calculated(packageInfo);
            return packageInfo;
          } else {
            return Promise.reject(DebounceError);
          }
        }));
      const packages = (await Promise.all(promises)).filter(x => x);
      if (currentCounter === pendingCounter[document.fileName]) {
        flushDecorations(document.fileName, packages);
      }
    } catch (e) {
      logger.log('decoratePackages error:' + e);
    }
  }
}
