import { window, Range, Position, DecorationOptions } from 'vscode';
const DECORATION_COLOR = '#C23B22';
const decorations = {};
let decorationsDebounce;
const decorationType = window.createTextEditorDecorationType({
  after: { color: DECORATION_COLOR, margin: '0 0 0 1rem' }
});

export function flushDecorations(fileName, packages) {
  decorations[fileName] = {};
  packages.forEach(packageInfo => calculated(packageInfo));
  refreshDecorations(fileName);
}

export function calculating(packageInfo) {
  decorate('Calculating...', packageInfo);
}

export function calculated(packageInfo) {
  decorate(packageInfo.size > 0 ? `${packageInfo.size}KB` : '', packageInfo);
}

function getEditors(fileName) {
  return window.visibleTextEditors.filter(editor => editor.document.fileName === fileName);
}

function refreshDecorations(fileName, delay = 10) {
  clearTimeout(decorationsDebounce);
  decorationsDebounce = setTimeout(() => getEditors(fileName).forEach(editor => {
    editor.setDecorations(
      decorationType,
      Object.keys(decorations[fileName]).map(x => decorations[fileName][x])
    );
  }), delay);
}

function decorate(text, packageInfo) {
  const {fileName, line} = packageInfo;
  decorations[fileName] = decorations[fileName] || {};
  decorations[fileName][line] = {
    renderOptions: {after: {contentText: text}},
    range: new Range(new Position(line - 1, 1024), new Position(line - 1, 1024))
  };
  refreshDecorations(fileName);
}
