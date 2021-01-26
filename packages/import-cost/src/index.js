import { getSize } from './packageInfo';
import { getPackages } from './parser';
import { EventEmitter } from 'events';

export { TYPESCRIPT, JAVASCRIPT, VUE, SVELTE } from './parser';
export { cleanup } from './packageInfo';

export function importCost(fileName, text, language, config = { maxCallTime: Infinity, concurrent: true }) {
	const emitter = new EventEmitter();
	setTimeout(async () => {
		try {
			const imports = getPackages(fileName, text, language).filter((packageInfo) => !packageInfo.name.startsWith('.'));
			emitter.emit('start', imports);
			const promises = imports
				.map((packageInfo) => getSize(packageInfo, config))
				.map((promise) =>
					promise.then((packageInfo) => {
						emitter.emit('calculated', packageInfo);
						return packageInfo;
					})
				);
			const packages = (await Promise.all(promises)).filter((x) => x);
			emitter.emit('done', packages);
		} catch (e) {
			emitter.emit('error', e);
		}
	}, 0);
	return emitter;
}
