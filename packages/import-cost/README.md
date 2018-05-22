# import-cost [![Build Status](https://travis-ci.org/wix/import-cost.svg?branch=master)](https://travis-ci.org/wix/import-cost) [![Build status](https://ci.appveyor.com/api/projects/status/ko48qav9qqb8fv8u?svg=true)](https://ci.appveyor.com/project/shahata/import-cost)

This node module comes to help people who would like to develop extensions similar to [Import Cost VSCode extension](https://marketplace.visualstudio.com/items?itemName=wix.vscode-import-cost) for additional IDE's such as Atom, WebStorm, Sublime, Vim etc.

Use freely to implement extensions for other IDE (or contribute them to this repository)

You can see good reference for how to work with this module in the [VSCode extension implementation](https://github.com/wix/import-cost/blob/master/packages/vscode-import-cost/src/extension.ts)

## How to use

```sh
$ npm install --save import-cost
```

```js
import {importCost, cleanup, JAVASCRIPT, TYPESCRIPT} from 'import-cost';

const emitter = importCost(fileName, fileContents, JAVASCRIPT /* or TYPESCRIPT */);
emitter.on('error', e => /* handle parse error of file, usually just log & ignore */);
emitter.on('start', packages => /* mark those packages as "calculating..." */);
emitter.on('calculated', package => /* show size of this single package */);
emitter.on('done', packages => /* show sizes of all those packages */);
emitter.removeAllListeners(); /* ask to stop getting events in case file was updated */)

// ...

cleanup(); /* do this when you shutdown your extension in order to kill our thread pool */
```

## API

Usage as you can see above is pretty straight forward, `importCost()` gets three parameters:

1) `fileName` - This is a `string` representing the full path to the file that is being processed. We need full file path since we need to look inside `node_modules` folder of the file in question
2) `fileContents` - This is a `string` which contains the actual content of the file. We need it because in IDE extension it is usually much faster to get contents from IDE then reading it from filesystem. Also, obviously changes to the file might not have been saved yet, we want to work on the file as the user types to it.
3) `language` - This effects which AST parser we will use to lookup the imports in the file. As you can see above, you pass either `JAVASCRIPT` or `TYPESCRIPT` to it. Typically IDE can tell you the language of the file, better use the correct API of your IDE then rely on extensions.

In response, `importCost()` returns a standard Node `EventEmitter`. You can read about event emitters in [Node docs](https://nodejs.org/api/events.html#events_class_eventemitter), but typically all you need to know is that you can register a callback for various events we emit using `emitter.on(eventName, callback)`. We also recommend you un-register using `emitter.removeAllListeners()` when the file in question changes, this will help you not be confused with any results that are no longer relevant to that file.

## Events

Following are the events you can listen on for the returned emitter.

### emitter.on('error', e => /* ... */);

The emitter will emit an `'error'` event for any error that caused it to stop working on the task at hand. Typically, you will not get any other event from the emitter after this error happened. Usually error will be that we failed to parse the file, but that's not really something that you need to act on since it is perfectly fine that user's code is sometimes not valid while he types. `e` will contain the error details, feel free to log it somewhere for cases it might be useful.

### emitter.on('start', packages => /* ... */);

The emitter will emit a `'start'` event right after it finished parsing the file and knows which imports are going to be calculated. The callback will receive an `Array` of `{fileName, line}` objects. Typically this would be a good time for your extension to mark those lines in the file as being calculated.

### emitter.on('calculated', package => /* ... */);

The emitter will emit a `'calculated'` event for each of the packages as results arrive from our thread pool. The callback will receive a `{fileName, line, size, gzip}` object. Typically this would be where your extension displays the result in the appropriate line. The `size` in case we failed to calculate (mostly because of missing dependency) will be `0`.

### emitter.on('done', packages => /* ... */);

The emitter will emit a `'done'` event once we have results for all of the packages. The callback will receive an `Array` of `{fileName, line, size, gzip}` object. This is not super helpful since by now you already received a `'calculated'` event for each one of the packages in this array. However, it is a pretty good checkpoint to clear any decorations in lines that do not appear on this list and were left hanging because of some race condition edge cases.

### emitter.removeAllListeners();

As mentioned above, we recommend you un-register all of your event listeners using `emitter.removeAllListeners()` when the file in question changes, this will help you not be confused with any results that are no longer to that file.

## Cleanup

As mentioned above, we use a thread pool for doing the calculations. When your extension terminates, your IDE will typically send you some notification of that. It is important that you handle this notification and invoke `cleanup()` in order to kill the thread pool.
