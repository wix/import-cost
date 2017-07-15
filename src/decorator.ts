import { window, Range, Position } from "vscode";

export function decorate(decoration) {
  window.activeTextEditor.setDecorations(decoration.decoration, [decoration.range]);
}

export function createRawDecoration(text: string, line: number, color: string = '#C23B22') {
  const decoration = window.createTextEditorDecorationType({
    after: { color, contentText: text, margin: '0 0 0 1rem' }
  });
  const rangeMod = +Math.ceil(Math.random() * 1000);
  const range = new Range(new Position(line - 1, 1024 + rangeMod), new Position(line - 1, 1024 + rangeMod));
  return { decoration, range };
}
