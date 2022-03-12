const { window, workspace } = require('vscode');
const { EventEmitter } = require('events');

class Logger {
  log(text) {
    if (workspace.getConfiguration('importCost').debug && !this.channel) {
      this.channel = window.createOutputChannel('ImportCost');
    }
    this.channel?.appendLine(text);
    this.emitter = this.emitter || new EventEmitter();
    this.emitter.emit('log', text);
  }

  onLog(listener) {
    this.emitter = this.emitter || new EventEmitter();
    this.emitter.on('log', listener);
  }

  dispose() {
    this.channel?.dispose();
    delete this.channel;
  }
}

module.exports = new Logger();
