const { window, workspace } = require('vscode');

class Logger {
  init(context) {
    if (workspace.getConfiguration('importCost').debug) {
      this.channel = window.createOutputChannel('ImportCost');
      context.subscriptions.push(this.channel);
    }
  }

  log(text) {
    this.channel?.appendLine(text);
  }
}

module.exports = new Logger();
