import {OutputChannel, ExtensionContext, window, workspace} from 'vscode';

class Logger {
  private channel: OutputChannel;
  private context: ExtensionContext;
  private debug: boolean = !!workspace.getConfiguration('importCost').debug;

  init(context: ExtensionContext) {
    this.context = context;
    if (this.debug) {
      this.channel = window.createOutputChannel('ImportCost');
      context.subscriptions.push(this.channel);
    }
  }

  log(text: string) {
    if (this.debug) {
      this.channel.appendLine(text);
    }
  }
}

export default new Logger();
