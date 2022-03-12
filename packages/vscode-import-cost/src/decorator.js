const {workspace, window, Range, Position} = require('vscode');
const fileSize = require('filesize');
const logger = require('./logger');

const decorations = {};

function flushDecorations(fileName, packages) {
  logger.log(`Flushing decorations ${JSON.stringify(packages, null , 2)}`);
  decorations[fileName] = {};
  packages.forEach(packageInfo => {
    if (packageInfo.size === undefined) {
      const configuration = workspace.getConfiguration('importCost');
      if (configuration.showCalculatingDecoration) {
        decorate('Calculating...', packageInfo);
      }
    } else {
      calculated(packageInfo);
    }
  });
  refreshDecorations(fileName);
}

function calculated(packageInfo) {
  const decorationMessage = getDecorationMessage(packageInfo);
  decorate(decorationMessage, packageInfo, getDecorationColor(packageInfo.size));
}

function getDecorationMessage(packageInfo) {
  if (packageInfo.size <= 0) {
    return '';
  }

  let decorationMessage;
  const configuration = workspace.getConfiguration('importCost');
  const size = fileSize(packageInfo.size, {unix: true});
  const gzip = fileSize(packageInfo.gzip, {unix: true});
  if (configuration.bundleSizeDecoration === 'both') {
    decorationMessage = `${size} (gzipped: ${gzip})`;
  } else if (configuration.bundleSizeDecoration === 'minified') {
    decorationMessage = size;
  } else if (configuration.bundleSizeDecoration === 'gzipped') {
    decorationMessage = gzip;
  }
  return decorationMessage;
}

function getDecorationColor(size) {
  const configuration = workspace.getConfiguration('importCost');
  const sizeInKB = size / 1024;
  if (sizeInKB < configuration.smallPackageSize) {
    return configuration.smallPackageColor;
  } else if (sizeInKB < configuration.mediumPackageSize) {
    return configuration.mediumPackageColor;
  } else {
    return configuration.largePackageColor;
  }
}

function decorate(text, packageInfo, color = getDecorationColor(0)) {
  const {fileName, line} = packageInfo;
  logger.log(`Setting Decoration: ${text}, ${JSON.stringify(packageInfo, null, 2)}`);
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

function clearDecorations() {
  window.visibleTextEditors.forEach(textEditor => {
    return textEditor.setDecorations(decorationType, []);
  });
}

module.exports = {
  flushDecorations,
  calculated,
  clearDecorations
};
