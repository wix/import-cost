const { window, workspace, commands } = require('vscode');
const { importCost, cleanup, Lang } = require('import-cost');
const { calculated, flushDecorations, clearDecorations } = require('./decorator');
const logger = require('./logger');

let isActive = true;

function activate(context) {
  try {
    logger.init(context);
    logger.log('starting...');
    workspace.onDidChangeTextDocument(ev => isActive && processActiveFile(ev.document));
    window.onDidChangeActiveTextEditor(ev => ev && isActive && processActiveFile(ev.document));
    if (window.activeTextEditor && isActive) {
      processActiveFile(window.activeTextEditor.document);
    }

    context.subscriptions.push(commands.registerCommand('importCost.toggle', () => {
      isActive = !isActive;
      if (isActive && window.activeTextEditor) {
        processActiveFile(window.activeTextEditor.document);
      } else {
        deactivate();
        clearDecorations();
      }
    }));
  } catch (e) {
    logger.log('wrapping error: ' + e);
  }
}

function deactivate() {
  cleanup();
}

let emitters = {};
async function processActiveFile(document) {
  if (document && language(document)) {
    const { fileName } = document;
    if (emitters[fileName]) {
      emitters[fileName].removeAllListeners();
    }
    const { timeout } = workspace.getConfiguration('importCost');
    emitters[fileName] = importCost(fileName, document.getText(), language(document), { concurrent: true, maxCallTime: timeout });
    emitters[fileName].on('error', e => logger.log(`importCost error: ${e}`));
    emitters[fileName].on('start', packages => flushDecorations(fileName, packages));
    emitters[fileName].on('calculated', packageInfo => calculated(packageInfo));
    emitters[fileName].on('done', packages => flushDecorations(fileName, packages));
  }
}

function language({ fileName, languageId }) {
  if (languageId === 'Log') {
    return;
  }
  const configuration = workspace.getConfiguration('importCost');
  const typescriptRegex = new RegExp(configuration.typescriptExtensions.join('|'));
  const javascriptRegex = new RegExp(configuration.javascriptExtensions.join('|'));
  const vueRegex = new RegExp(configuration.vueExtensions.join('|'));
  const svelteRegex = new RegExp(configuration.svelteExtensions.join('|'));
  if (languageId === 'svelte' || svelteRegex.test(fileName)) {
    return Lang.SVELTE;
  } else if (languageId === 'vue' || vueRegex.test(fileName)) {
    return Lang.VUE;
  } else if (languageId === 'typescript' || languageId === 'typescriptreact' || typescriptRegex.test(fileName)) {
    return Lang.TYPESCRIPT;
  } else if (languageId === 'javascript' || languageId === 'javascriptreact' || javascriptRegex.test(fileName)) {
    return Lang.JAVASCRIPT;
  } else {
    return undefined;
  }
}

module.exports = {
  activate,
  deactivate
};
