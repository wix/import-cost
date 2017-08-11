import {workspace, window, Range, Position} from 'vscode';
import * as fileSize from 'filesize';

const configuration = workspace.getConfiguration('importCost');
const decorations = {};

export function flushDecorations(fileName, packages) {
  decorations[fileName] = {};
  packages.forEach(packageInfo => {
    if (packageInfo.size === undefined) {
      decorate('Calculating...', packageInfo);
    } else {
      calculated(packageInfo);
    }
  });
  refreshDecorations(fileName);
}

export function calculated(packageInfo) {
  const size = fileSize(packageInfo.size, {unix: true});
  const gzip = fileSize(packageInfo.gzip, {unix: true});
  decorate(
    packageInfo.size > 0 ? `${size} (gzipped: ${gzip})` : '',
    packageInfo,
    getDecorationColor(packageInfo.size)
  );
}

function getDecorationColor(size) {
  const sizeInKB = size / 1024;
  if (sizeInKB < configuration.smallPackageSize) {
    return configuration.smallPackageColor;
  } else if (sizeInKB < configuration.mediumPackageSize) {
    return configuration.mediumPackageColor;
  } else {
    return configuration.largePackageColor;
  }
}

function decorate(text, packageInfo, color = configuration.smallPackageColor) {
  const {fileName, line} = packageInfo;
  decorations[fileName][line] = {
    renderOptions: {after: {contentText: text, color}},
    range: new Range(new Position(line - 1, 1024), new Position(line - 1, 1024))
  };
  refreshDecorations(fileName);
}

const decorationType = window.createTextEditorDecorationType({after: {margin: '0 0 0 1rem'}});
let decorationsDebounce;
function refreshDecorations(fileName, delay = 10) {
  clearTimeout(decorationsDebounce);
  decorationsDebounce = setTimeout(
    () =>
      getEditors(fileName).forEach(editor => {
        editor.setDecorations(
          decorationType,
          Object.keys(decorations[fileName]).map(x => decorations[fileName][x])
        );
      }),
    delay
  );
}

function getEditors(fileName) {
  return window.visibleTextEditors.filter(editor => editor.document.fileName === fileName);
}
