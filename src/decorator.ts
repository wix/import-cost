import { window, Range, Position, DecorationOptions } from 'vscode';
const DECORATION_COLOR = '#C23B22';
const decorations = {};
const decorationsCache = {};
const decorationsDebounce = {};

export function flushDecorations(fileName, packages) {
  (decorations[fileName] || []).forEach(packageInfo => {
    decorate('', packageInfo);
  });
  packages.forEach(packageInfo => {
    calculated(packageInfo);
  });
  decorations[fileName] = packages;
}

export function calculating(packageInfo) {
  decorations[packageInfo.fileName] = (decorations[packageInfo.fileName] || []).concat([packageInfo]);
  decorate('Calculating...', packageInfo);
}

export function calculated(packageInfo) {
  decorate(packageInfo.size > 0 ? packageInfo.size.toString() + 'KB' : '', packageInfo);
}

function getEditor(fileName) {
  return window.visibleTextEditors.filter(editor => editor.document.fileName === fileName).pop();
}

function decorate(text: string, packageInfo) {
  const {fileName, line} = packageInfo;
  const key = `${fileName}:${line}`;
  if (!decorationsCache[key]) {
    decorationsCache[key] = window.createTextEditorDecorationType({
      after: { color: DECORATION_COLOR, margin: '0 0 0 1rem' }
    });
  }
  clearTimeout(decorationsDebounce[key]);
  decorationsDebounce[key] = setTimeout(() => {
    const editor = getEditor(packageInfo.fileName);
    if (editor) {
      editor.setDecorations(
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
  }, 100);
}
