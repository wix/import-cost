const promises = {};

export const DebounceError = new Error('DebounceError');

export function debouncePromise(key, fn, delay = 500) {
  const promise = new Promise((resolve, reject) => {
    setTimeout(
      () =>
        promises[key] === promise
          ? new Promise(fn).then(resolve).catch(reject)
          : reject(DebounceError),
      delay,
    );
  });
  return (promises[key] = promise);
}
