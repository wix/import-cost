import { getPackages as getPackagesFromJS } from './babelParser';

export const TYPESCRIPT = 'typescript';
export const JAVASCRIPT = 'javascript';

export function getPackages(fileName, source, language) {
  if ([TYPESCRIPT, JAVASCRIPT].some(l => l === language)) {
    return getPackagesFromJS(fileName, source, language);
  } else {
    return [];
  }
}
