import * as webpack from 'webpack';
import * as MemoryFS from 'memory-fs';
import * as BabiliPlugin from 'babili-webpack-plugin';

module.exports = function pack({fileName, modulesDirectory}, callback) {
  const compiler = webpack({
    entry: fileName,
    plugins: [new BabiliPlugin()],
    resolve: {
      modules: [modulesDirectory]
    }
  });

  (compiler as webpack.Compiler).outputFileSystem = new MemoryFS();

  compiler.run((err, stats) => {
    if (err || stats.toJson().errors.length > 0) {
      callback({err: err || stats.toJson().errors});
    } else {
      const size = Math.round(stats.toJson().assets[0].size / 1024);
      callback({size});
    }
  });
}
