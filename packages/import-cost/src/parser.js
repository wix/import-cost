import { getPackages as getPackagesFromJS } from './jsParser';
import { getPackages as getPackagesFromTS } from './tsParser';

export const TYPESCRIPT = 'typescript';
export const JAVASCRIPT = 'javascript';

export function getPackages(fileName, source, language) {
  if (language === TYPESCRIPT) {
    return getPackagesFromTS(fileName, source);
  } else if (language === JAVASCRIPT) {
    return getPackagesFromJS(fileName, source);
  } else {
    return [];
  }
}
