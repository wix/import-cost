import { OutputChannel, ExtensionContext, window } from 'vscode';

class Logger {
  private channel: OutputChannel;
  private context: ExtensionContext;

  init(context: ExtensionContext) {
    this.context = context;
    this.channel = window.createOutputChannel('ImportCost');
    context.subscriptions.push(this.channel);
  }

  log(text: string) {
    this.channel.appendLine(text);
  }
}

export default new Logger();
