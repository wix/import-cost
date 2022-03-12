const cheerio = require('cheerio');
const { getPackages: getPackagesFromJS } = require('./babel-parser.js');
const { Lang } = require('./langs.js');

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

function getPackages(fileName, source, language) {
	if ([Lang.SVELTE, Lang.VUE].some((l) => l === language)) {
		const scriptSource = extractScriptFromHtml(source);
		const scriptLine = getScriptTagLineNumber(source);
		return getPackagesFromJS(fileName, scriptSource, Lang.TYPESCRIPT, scriptLine);
	} else if ([Lang.TYPESCRIPT, Lang.JAVASCRIPT].some((l) => l === language)) {
		return getPackagesFromJS(fileName, source, language);
	} else {
		return [];
	}
}

module.exports = {
	getPackages,
};
