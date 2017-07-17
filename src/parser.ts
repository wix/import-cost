import logger from './logger';
import { getPackages as getPackagesFromJS } from './jsParser';
import { getPackages as getPackagesFromTS } from './tsParser';

export function getPackages(filename, source) {
  if (/\.tsx?$/.test(filename)) {
    logger.log('using typescript parser:' + filename);
    return getPackagesFromTS(filename, source);
  }
  logger.log('using javascript parser:' + filename);
  return getPackagesFromJS(source);
}
