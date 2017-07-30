import logger from './logger';
import { getPackages as getPackagesFromJS } from './jsParser';
import { getPackages as getPackagesFromTS } from './tsParser';

export function getPackages(fileName, source) {
  if (/\.tsx?$/.test(fileName)) {
    logger.log('using typescript parser:' + fileName);
    return getPackagesFromTS(fileName, source);
  } else if (/\.jsx?$/.test(fileName)) {
    logger.log('using javascript parser:' + fileName);
    return getPackagesFromJS(fileName, source);
  } else {
    return [];
  }
}
