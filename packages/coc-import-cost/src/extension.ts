import {cleanup} from 'import-cost';
import {ExtensionContext, languages, commands} from 'coc.nvim';
import ImportCostCodeLensProvider from './codeLensProvider';
import logger from './logger';

let active = true;
function isActive() {
  return active;
}

export function activate(context: ExtensionContext) {
  logger.init(context);
  logger.log('starting...');
  languages.registerCodeLensProvider(
    [
      {language: 'typescript'},
      {language: 'typescript.tsx'},
      {language: 'typescriptreact'},
      {language: 'javascript'},
      {language: 'javascript.jsx'},
      {language: 'javascriptreact'}
    ],
    new ImportCostCodeLensProvider(isActive)
  );

  commands.registerCommand('importCost.toggle', () => { active = !active; });

  return {ready: Promise.resolve()};
}

export function deactivate() {
  cleanup();
}
