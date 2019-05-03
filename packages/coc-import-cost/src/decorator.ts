import {importCost, JAVASCRIPT, TYPESCRIPT} from 'import-cost';
import {workspace, CodeLensProvider} from 'coc.nvim';
import {
  CancellationToken,
  CodeLens,
  TextDocument
} from 'vscode-languageserver-protocol';
import fileSize from 'filesize';
import logger from './logger';

const calculatedCodeLens = {};
const emitters = {};

function language(doc) {
  const fileName = doc.uri;
  const languageId = doc.fileType;
  const configuration = workspace.getConfiguration('importCost');
  const typescriptRegex = new RegExp(
    configuration.typescriptExtensions.join('|')
  );
  const javascriptRegex = new RegExp(
    configuration.javascriptExtensions.join('|')
  );
  if (
    languageId === 'typescript' ||
    languageId === 'typescriptreact' ||
    typescriptRegex.test(fileName)
  ) {
    return TYPESCRIPT;
  } else if (
    languageId === 'javascript' ||
    languageId === 'javascriptreact' ||
    javascriptRegex.test(fileName)
  ) {
    return JAVASCRIPT;
  } else {
    return undefined;
  }
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

const uriFileProtocol = 'file://';
function getFileName(uri) {
  if (uri.startsWith(uriFileProtocol)) {
    return uri.slice(uriFileProtocol.length);
  } else {
    return uri;
  }
}

export default class ImportCostCodeLensProvider implements CodeLensProvider {
  private isActive = () => true;

  public constructor(isActive) {
    this.isActive = isActive;
  }

  public provideCodeLenses(
    document: TextDocument,
    token: CancellationToken
  ): Promise<CodeLens[]> {
    return new Promise((resolve, reject) => {
      if (!this.isActive()) { resolve([]); }

      const fileName = getFileName(document.uri);
      const {timeout} = workspace.getConfiguration('importCost');
      calculatedCodeLens[fileName] = {};
      try {
        emitters[fileName] = importCost(
          fileName,
          document.getText(),
          language(document),
          {concurrent: true, maxCallTime: timeout}
        );

        emitters[fileName].on('start', packages => {
          try {
            flushCodeLens(fileName, packages);
            packages.forEach(packageInfo => {
              if (packageInfo.size === undefined) {
                const configuration = workspace.getConfiguration('importCost');
                if (configuration.showCalculatingDecoration) {
                  makeCodeLens('Calculating...', packageInfo);
                }
              } else {
                calculated(packageInfo);
              }
            });
          } catch (e) {
            logger.log(`Exception in start emitter: ${e}`);
          }
        });

        emitters[fileName].on('calculated', packageInfo => {
          try {
            logger.log(
              `calculated ${packageInfo.name}: ${JSON.stringify(
                packageInfo,
                null,
                2
              )}`
            );
            const {fileName: pkgInfoFileName, line} = packageInfo;
            calculatedCodeLens[pkgInfoFileName][line] = getDecorationMessage(
              packageInfo
            );
          } catch (e) {
            logger.log(`Exception in calculated emitter: ${e}`);
          }
        });

        emitters[fileName].on('done', packages => {
          try {
            const imports = packages.filter(pkg => pkg.size > 0).map(pkg => {
              logger.log(
                `done with ${pkg.name}: ${JSON.stringify(pkg, null, 2)}`
              );
              return makeCodeLens(getDecorationMessage(pkg), pkg);
            });

            resolve(imports);
          } catch (e) {
            logger.log(`Exception in done emitter: ${e}`);
            resolve();
          }
        });

        emitters[fileName].on('error', e => {
          logger.log(
            `error while calculating import costs for ${fileName}: ${e}`
          );
        });
      } catch (e) {
        resolve();
      }
    });
  }

  public resolveCodeLens(
    codeLens: CodeLens,
    token: CancellationToken
  ): Promise<CodeLens> {
    const fileName = codeLens.data.fileName;

    return calculatedCodeLens[fileName][codeLens.range.start.line];
  }
}

function makeCodeLens(text, packageInfo) {
  const {fileName, line} = packageInfo;
  const position = {line: packageInfo.line - 1, character: 1024};
  logger.log(
    `Setting Decoration: ${text}, ${JSON.stringify(packageInfo, null, 2)}`
  );
  const codeLens = {
    command: {title: text},
    range: {start: position, end: position},
    data: {fileName}
  };
  calculatedCodeLens[fileName][line] = codeLens;
  return codeLens;
}

export function calculated(packageInfo) {
  const decorationMessage = getDecorationMessage(packageInfo);
  makeCodeLens(decorationMessage, packageInfo);
}

export function flushCodeLens(fileName, packages?) {
  logger.log(`Flushing decorations ${JSON.stringify(packages, null, 2)}`);
  calculatedCodeLens[fileName] = {};
  if (packages) {
    packages.forEach(packageInfo => {
      if (packageInfo.size === undefined) {
        const configuration = workspace.getConfiguration('importCost');
        if (configuration.showCalculatingDecoration) {
          makeCodeLens('Calculating...', packageInfo);
        }
      } else {
        calculated(packageInfo);
      }
    });
  }
}
