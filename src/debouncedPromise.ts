const debouncePromises = {};

const debounceInProgressPromises = {};

export const DebounceError = new Error('debounced');

export function debouncePromise(key, fn) {
  const promise = new Promise((resolve, reject) => {
    setTimeout(function check() {
      if (debouncePromises[key] === promise) {
        new Promise(fn).then(resolve).catch(reject);
      } else {
        reject(DebounceError);
      }
    }, 500);
  });
  return debouncePromises[key] = promise;
}

