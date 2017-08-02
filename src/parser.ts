import logger from './logger';
import {getPackages as getPackagesFromJS} from './jsParser';
import {getPackages as getPackagesFromTS} from './tsParser';
import configuration from './config';

const typescriptRegex = new RegExp(configuration.typescriptExtensions.join('|'));
const javascriptRegex = new RegExp(configuration.javascriptExtensions.join('|'));

export function getPackages(fileName, source) {
  if (typescriptRegex.test(fileName)) {
    logger.log('using typescript parser:' + fileName);
    return getPackagesFromTS(fileName, source);
  } else if (javascriptRegex.test(fileName)) {
    logger.log('using javascript parser:' + fileName);
    return getPackagesFromJS(fileName, source);
  } else {
    return [];
  }
}
