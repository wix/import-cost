const fsExtra = require('fs-extra');
const path = require('path');

const FileType = {
  Unknown: 0,
  File: 1,
  Directory: 2,
  SymbolicLink: 64,
};

function convertStat(old, filetype) {
  return {
    type: filetype,
    size: old.size,
    ctime: Math.round(old.ctimeMs),
    mtime: Math.round(old.mtimeMs),
  };
}

class NativeFileSystemAPI {
  async readFile(uri) {
    return fsExtra.readFile(uri.fsPath);
  }
  async writeFile(uri, content) {
    await fsExtra.mkdirs(path.dirname(uri.fsPath));
    return fsExtra.writeFile(uri.fsPath, Buffer.from(content));
  }
  async delete(uri) {
    return fsExtra.stat(uri.fsPath).then(() => fsExtra.remove(uri.fsPath));
  }
  async stat(uri) {
    const filename = uri.fsPath;
    let filetype = FileType.Unknown;
    let stat = await fsExtra.lstat(filename);
    if (stat.isSymbolicLink()) {
      filetype = FileType.SymbolicLink;
      stat = await fsExtra.stat(filename);
    }
    if (stat.isFile()) {
      filetype |= FileType.File;
    } else if (stat.isDirectory()) {
      filetype |= FileType.Directory;
    }
    return convertStat(stat, filetype);
  }
  async readDirectory(uri) {
    const names = await fsExtra.readdir(uri.fsPath);
    const promises = names.map(name => {
      const filename = path.join(uri.fsPath, name);
      return fsExtra
        .lstat(filename)
        .then(async stat => {
          let filetype = FileType.Unknown;
          if (stat.isFile()) {
            filetype = FileType.File;
          } else if (stat.isDirectory()) {
            filetype = FileType.Directory;
          } else if (stat.isSymbolicLink()) {
            filetype = FileType.SymbolicLink;
            stat = await fsExtra.stat(filename);
            if (stat.isFile()) {
              filetype |= FileType.File;
            } else if (stat.isDirectory()) {
              filetype |= FileType.Directory;
            }
          }
          return [name, filetype];
        })
        .catch(() => [name, FileType.Unknown]);
    });
    return Promise.all(promises);
  }
  async createDirectory(uri) {
    return fsExtra.mkdirp(uri.fsPath);
  }
  async copy(src, dest) {
    return new Promise((resolve, reject) => {
      const rs = fsExtra.createReadStream(src.fsPath).on('error', err => {
        reject(err);
      });
      const ws = fsExtra
        .createWriteStream(dest.fsPath)
        .on('error', err => {
          reject(err);
        })
        .on('close', () => {
          resolve();
        });
      rs.pipe(ws);
    });
  }
  async rename(src, dest) {
    return fsExtra.rename(src.fsPath, dest.fsPath);
  }
}

module.exports = new NativeFileSystemAPI();
