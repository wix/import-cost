import {workspace, window} from 'coc.nvim';

class Logger {
  private channel;

  init(context) {
    if (workspace.getConfiguration('importCost').debug) {
      this.channel = window.createOutputChannel('ImportCost');
      context.subscriptions.push(this.channel);
    }
  }

  log(text: string) {
    this.channel?.appendLine(text);
  }
}

export default new Logger();
