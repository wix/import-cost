import { window, Range, Position, DecorationOptions } from 'vscode';
import * as filesize from 'filesize';

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
  const size = filesize(packageInfo.size, {unix: true});
  decorate(packageInfo.size > 0 ? `${size}` : '', packageInfo);
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
