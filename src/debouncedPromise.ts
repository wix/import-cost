const debouncePromises = {};

const debounceInProgressPromises = {};

export const DebounceError = new Error('debounced');

export function debouncePromise(key, fn) {
  const promise = new Promise((resolve, reject) => {
    setTimeout(function check() {
      if (debouncePromises[key] === promise) {
        if (debounceInProgressPromises[key]) {
          debounceInProgressPromises[key].catch(() => undefined).then(() => {
            delete debounceInProgressPromises[key];
            check();
          });
        } else {
          debounceInProgressPromises[key] = new Promise(fn);
          debounceInProgressPromises[key].then(resolve).catch(reject);
        }
      } else {
        reject(DebounceError);
      }
    }, 500);
  });
  return debouncePromises[key] = promise;
}

