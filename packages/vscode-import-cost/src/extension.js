if (typeof self !== 'undefined') {
  /* global self */
  //hacks for global scope of web worker
  self.setImmediate = self.setImmediate || (fn => setTimeout(fn, 0));
  self.Buffer = self.Buffer || require('buffer').Buffer;
  self.process = require('process/browser');
  self.process.hrtime = require('browser-process-hrtime');
  self.process.stderr = {};
}

const { window, workspace, commands } = require('vscode');
const { importCost, cleanup, Lang } = require('import-cost');
const { calculated, setDecorations, clearDecorations } = require('./decorator');
const logger = require('./logger');

let isActive = true;

function activate(context) {
  try {
    logger.log('starting...');
    workspace.onDidChangeTextDocument(ev => processActiveFile(ev.document));
    window.onDidChangeActiveTextEditor(ev => processActiveFile(ev?.document));
    processActiveFile(window.activeTextEditor?.document);

    context.subscriptions.push(
      commands.registerCommand('importCost.toggle', () => {
        isActive = !isActive;
        if (isActive) {
          processActiveFile(window.activeTextEditor?.document);
        } else {
          deactivate();
        }
      }),
    );
  } catch (e) {
    logger.log('wrapping error: ' + e);
  }
  return { logger };
}

function deactivate() {
  cleanup();
  logger.dispose();
  clearDecorations();
}

let emitters = {};
async function processActiveFile(document) {
  if (isActive && document && language(document)) {
    const { fileName } = document;
    emitters[fileName]?.removeAllListeners();

    const { timeout } = workspace.getConfiguration('importCost');
    const config = { concurrent: false, maxCallTime: timeout };
    const text = document.getText();
    const emitter = importCost(fileName, text, language(document), config);
    emitter.on('error', e => logger.log(`importCost error: ${e}`));
    emitter.on('start', packages => setDecorations(fileName, packages));
    emitter.on('calculated', packageInfo => calculated(fileName, packageInfo));
    emitter.on('done', packages => setDecorations(fileName, packages));
    emitter.on('log', log => logger.log(log));
    emitters[fileName] = emitter;
  }
}

function language({ fileName, languageId }) {
  if (languageId === 'Log') {
    return;
  }
  const configuration = workspace.getConfiguration('importCost');
  const typescriptRegex = new RegExp(
    configuration.typescriptExtensions.join('|'),
  );
  const javascriptRegex = new RegExp(
    configuration.javascriptExtensions.join('|'),
  );
  const vueRegex = new RegExp(configuration.vueExtensions.join('|'));
  const svelteRegex = new RegExp(configuration.svelteExtensions.join('|'));
  if (languageId === 'svelte' || svelteRegex.test(fileName)) {
    return Lang.SVELTE;
  } else if (languageId === 'vue' || vueRegex.test(fileName)) {
    return Lang.VUE;
  } else if (
    languageId === 'typescript' ||
    languageId === 'typescriptreact' ||
    typescriptRegex.test(fileName)
  ) {
    return Lang.TYPESCRIPT;
  } else if (
    languageId === 'javascript' ||
    languageId === 'javascriptreact' ||
    javascriptRegex.test(fileName)
  ) {
    return Lang.JAVASCRIPT;
  } else {
    return undefined;
  }
}

module.exports = {
  activate,
  deactivate,
};
