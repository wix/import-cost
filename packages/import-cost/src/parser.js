import cheerio from 'cheerio';
import { getPackages as getPackagesFromJS } from './babelParser';

export const TYPESCRIPT = 'typescript';
export const JAVASCRIPT = 'javascript';
export const VUE = 'vue';
export const SVELTE = 'svelte';

function extractScriptFromHtml(html) {
	try {
		const $ = cheerio.load(html);
		const code = $('script').html();
		return code;
	} catch (e) {
		console.error(`ERR`, e);
		return '';
	}
}

function getScriptTagLineNumber(html) {
	const splitted = html.split('\n');
	for (let i = 0; i < splitted.length; i++) {
		if (/\<script/.test(splitted[i])) {
			return i;
		}
	}
	return 0;
}

export function getPackages(fileName, source, language) {
	if ([SVELTE, VUE].some((l) => l === language)) {
		const scriptSource = extractScriptFromHtml(source);
		const scriptLine = getScriptTagLineNumber(source);
		return getPackagesFromJS(fileName, scriptSource, TYPESCRIPT, scriptLine);
	} else if ([TYPESCRIPT, JAVASCRIPT].some((l) => l === language)) {
		return getPackagesFromJS(fileName, source, language);
	} else {
		return [];
	}
}
