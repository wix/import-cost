import {importCost, cleanup, JAVASCRIPT, TYPESCRIPT} from 'import-cost';
import {ExtensionContext, window, workspace} from 'vscode';
import {calculated, flushDecorations} from './decorator';
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

let emitters = {};
async function processActiveFile(document) {
  if (document && language(document)) {
    const {fileName} = document;
    if (emitters[fileName]) {
      emitters[fileName].removeAllListeners();
    }
    emitters[fileName] = importCost(fileName, document.getText(), language(document));
    emitters[fileName].on('error', e => logger.log('importCost error:' + e));
    emitters[fileName].on('start', packages => flushDecorations(fileName, packages));
    emitters[fileName].on('calculated', packageInfo => calculated(packageInfo));
    emitters[fileName].on('done', packages => flushDecorations(fileName, packages));
  }
}

function language({fileName, languageId}) {
  const configuration = workspace.getConfiguration('importCost');
  const typescriptRegex = new RegExp(configuration.typescriptExtensions.join('|'));
  const javascriptRegex = new RegExp(configuration.javascriptExtensions.join('|'));
  if (typescriptRegex.test(fileName)) {
    return TYPESCRIPT;
  } else if (javascriptRegex.test(fileName)) {
    return JAVASCRIPT;
  } else   if (languageId === 'typescript') {
    return TYPESCRIPT;
  } else if (languageId === 'javascript') {
    return JAVASCRIPT;
  } else {
    return undefined;
  }
}
