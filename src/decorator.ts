import { window, Range, Position, DecorationOptions } from 'vscode';
const DECORATION_COLOR = '#C23B22';
const decorationsCache = {};

export function decorate(text: string, packageInfo) {
  const {fileName, line} = packageInfo;
  const key = `${fileName}:${line}`;
  if (!decorationsCache[key]) {
    decorationsCache[key] = window.createTextEditorDecorationType({
      after: { color: DECORATION_COLOR, margin: '0 0 0 1rem' }
    });
  }
  window.activeTextEditor.setDecorations(
    decorationsCache[key],
    <DecorationOptions[]>[
      {
        renderOptions: {
          after: {
            contentText: text
          }
        },
        range: new Range(new Position(line - 1, 1024), new Position(line - 1, 1024))
      }
    ]
  );
}
