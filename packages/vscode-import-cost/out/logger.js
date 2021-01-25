"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vscode_1 = require("vscode");
class Logger {
    constructor() {
        this.debug = !!vscode_1.workspace.getConfiguration('importCost').debug;
    }
    init(context) {
        this.context = context;
        if (this.debug) {
            this.channel = vscode_1.window.createOutputChannel('ImportCost');
            context.subscriptions.push(this.channel);
        }
    }
    log(text) {
        if (this.debug) {
            this.channel.appendLine(text);
        }
    }
}
exports.default = new Logger();
//# sourceMappingURL=logger.js.map