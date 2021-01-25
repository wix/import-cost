"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const import_cost_1 = require("import-cost");
const vscode_1 = require("vscode");
const decorator_1 = require("./decorator");
const logger_1 = require("./logger");
let isActive = true;
function activate(context) {
    try {
        logger_1.default.init(context);
        logger_1.default.log('starting...');
        vscode_1.workspace.onDidChangeTextDocument(ev => isActive && processActiveFile(ev.document));
        vscode_1.window.onDidChangeActiveTextEditor(ev => ev && isActive && processActiveFile(ev.document));
        if (vscode_1.window.activeTextEditor && isActive) {
            processActiveFile(vscode_1.window.activeTextEditor.document);
        }
        context.subscriptions.push(vscode_1.commands.registerCommand('importCost.toggle', () => {
            isActive = !isActive;
            if (isActive && vscode_1.window.activeTextEditor) {
                processActiveFile(vscode_1.window.activeTextEditor.document);
            }
            else {
                deactivate();
                decorator_1.clearDecorations();
            }
        }));
    }
    catch (e) {
        logger_1.default.log('wrapping error: ' + e);
    }
}
exports.activate = activate;
function deactivate() {
    import_cost_1.cleanup();
}
exports.deactivate = deactivate;
let emitters = {};
function processActiveFile(document) {
    return __awaiter(this, void 0, void 0, function* () {
        if (document && language(document)) {
            const { fileName } = document;
            if (emitters[fileName]) {
                emitters[fileName].removeAllListeners();
            }
            const { timeout } = vscode_1.workspace.getConfiguration('importCost');
            emitters[fileName] = import_cost_1.importCost(fileName, document.getText(), language(document), { concurrent: true, maxCallTime: timeout });
            emitters[fileName].on('error', e => logger_1.default.log(`importCost error: ${e}`));
            emitters[fileName].on('start', packages => decorator_1.flushDecorations(fileName, packages));
            emitters[fileName].on('calculated', packageInfo => decorator_1.calculated(packageInfo));
            emitters[fileName].on('done', packages => decorator_1.flushDecorations(fileName, packages));
        }
    });
}
function language({ fileName, languageId }) {
    const configuration = vscode_1.workspace.getConfiguration('importCost');
    const typescriptRegex = new RegExp(configuration.typescriptExtensions.join('|'));
    const javascriptRegex = new RegExp(configuration.javascriptExtensions.join('|'));
    if (languageId === 'typescript' || languageId === 'typescriptreact' || typescriptRegex.test(fileName)) {
        return import_cost_1.TYPESCRIPT;
    }
    else if (languageId === 'javascript' || languageId === 'javascriptreact' || javascriptRegex.test(fileName)) {
        return import_cost_1.JAVASCRIPT;
    }
    else {
        return undefined;
    }
}
//# sourceMappingURL=extension.js.map