const { workspace, window, Range, Position } = require('vscode');
const fileSize = require('filesize');
const logger = require('./logger');

const decorations = {};
const decorationType = window.createTextEditorDecorationType({
  after: { margin: '0 0 0 1rem' },
});

function setDecorations(fileName, packages) {
  decorations[fileName] = {};
  packages.forEach(packageInfo => decorate(fileName, packageInfo));
  flushDecorationsDebounced(fileName);
}

function decorate(fileName, packageInfo) {
  const { line } = packageInfo;
  decorations[fileName][line] = packageInfo;
}

function calculated(fileName, packageInfo) {
  if (packageInfo.error) {
    logger.log(
      `Error Calculated: ${JSON.stringify({ ...packageInfo, error: true })}`,
    );
    if (Array.isArray(packageInfo.error)) {
      packageInfo.error.forEach(err => {
        logger.log(err?.message || JSON.stringify(err));
      });
    } else {
      logger.log(packageInfo.error.toString());
    }
  } else {
    logger.log(`Calculated: ${JSON.stringify(packageInfo)}`);
  }
  decorate(fileName, packageInfo);
  flushDecorationsDebounced(fileName);
}

function getDecorationMessage(packageInfo) {
  if (!packageInfo) {
    return 'Calculating...';
  }
  let decorationMessage;
  const configuration = workspace.getConfiguration('importCost');
  const size = fileSize(packageInfo.size, { unix: true });
  const gzip = fileSize(packageInfo.gzip, { unix: true });
  if (configuration.bundleSizeDecoration === 'both') {
    decorationMessage = `${size} (gzipped: ${gzip})`;
  } else if (configuration.bundleSizeDecoration === 'minified') {
    decorationMessage = size;
  } else if (configuration.bundleSizeDecoration === 'gzipped') {
    decorationMessage = gzip;
  }
  return decorationMessage;
}

function getDecorationColor(packageInfo) {
  const configuration = workspace.getConfiguration('importCost');
  const size = packageInfo?.size || 0;
  const sizeInKB = size / 1024;
  if (sizeInKB < configuration.smallPackageSize) {
    return configuration.smallPackageColor;
  } else if (sizeInKB < configuration.mediumPackageSize) {
    return configuration.mediumPackageColor;
  } else {
    return configuration.largePackageColor;
  }
}

function decoration(line, packageInfo) {
  const text = getDecorationMessage(packageInfo);
  const color = getDecorationColor(packageInfo);
  return {
    renderOptions: { after: { contentText: text, color } },
    range: new Range(
      new Position(line - 1, 1024),
      new Position(line - 1, 1024),
    ),
  };
}

let decorationsDebounce;
function flushDecorationsDebounced(fileName) {
  clearTimeout(decorationsDebounce);
  decorationsDebounce = setTimeout(() => flushDecorations(fileName), 10);
}

function flushDecorations(fileName) {
  let arr = {};
  const { showCalculatingDecoration } =
    workspace.getConfiguration('importCost');
  Object.entries(decorations[fileName]).forEach(([line, packageInfo]) => {
    if (packageInfo.size === undefined && showCalculatingDecoration) {
      arr[line] = decoration(line, undefined);
    } else if (packageInfo.size > 0) {
      arr[line] = decoration(line, packageInfo);
    }
  });

  const log = Object.entries(arr)
    .map(([line, decoration]) => {
      const message = decoration.renderOptions.after.contentText;
      return `${fileName}, ${line}, ${message}`;
    })
    .join('\n');
  logger.log(`Setting decorations:\n${log}`);

  window.visibleTextEditors
    .filter(editor => editor.document.fileName === fileName)
    .forEach(editor => {
      editor.setDecorations(decorationType, Object.values(arr));
    });
}

function clearDecorations() {
  window.visibleTextEditors.forEach(textEditor => {
    textEditor.setDecorations(decorationType, []);
  });
}

module.exports = {
  setDecorations,
  calculated,
  clearDecorations,
};
