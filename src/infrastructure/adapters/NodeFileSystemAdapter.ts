/**
 * Node.jsのfsモジュールをIFileSystemGatewayインターフェースにアダプトするアダプター
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { promisify } from 'util';

import { 
  IFileSystemGateway, 
  FileInfo, 
  DirectoryInfo, 
  FileOperationOptions, 
  FileWatcherCallbacks 
} from '../../domain/gateways/IFileSystemGateway';

const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const appendFileAsync = promisify(fs.appendFile);
const statAsync = promisify(fs.stat);
const copyFileAsync = promisify(fs.copyFile);
const renameAsync = promisify(fs.rename);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const rmdirAsync = promisify(fs.rmdir);
const accessAsync = promisify(fs.access);

export class NodeFileSystemAdapter implements IFileSystemGateway {
  private watchers = new Map<string, fs.FSWatcher>();

  // ファイルの読み取り
  async readFile(path: string, options?: FileOperationOptions): Promise<string | Buffer> {
    return await readFileAsync(path, options?.encoding || 'utf8');
  }

  readFileSync(path: string, options?: FileOperationOptions): string | Buffer {
    return fs.readFileSync(path, options?.encoding || 'utf8');
  }

  // ファイルの書き込み
  async writeFile(path: string, data: string | Buffer, options?: FileOperationOptions): Promise<void> {
    await writeFileAsync(path, data, {
      encoding: options?.encoding || 'utf8',
      flag: options?.flag,
      mode: options?.mode
    });
  }

  writeFileSync(path: string, data: string | Buffer, options?: FileOperationOptions): void {
    fs.writeFileSync(path, data, {
      encoding: options?.encoding || 'utf8',
      flag: options?.flag,
      mode: options?.mode
    });
  }

  // ファイルの追記
  async appendFile(path: string, data: string | Buffer, options?: FileOperationOptions): Promise<void> {
    await appendFileAsync(path, data, {
      encoding: options?.encoding || 'utf8',
      flag: options?.flag,
      mode: options?.mode
    });
  }

  appendFileSync(path: string, data: string | Buffer, options?: FileOperationOptions): void {
    fs.appendFileSync(path, data, {
      encoding: options?.encoding || 'utf8',
      flag: options?.flag,
      mode: options?.mode
    });
  }

  // ファイルの存在確認
  async exists(path: string): Promise<boolean> {
    try {
      await accessAsync(path, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  existsSync(path: string): boolean {
    try {
      fs.accessSync(path, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  // ファイル情報の取得
  async getFileInfo(path: string): Promise<FileInfo> {
    const stats = await statAsync(path);
    return this.statsToFileInfo(path, stats);
  }

  getFileInfoSync(path: string): FileInfo {
    const stats = fs.statSync(path);
    return this.statsToFileInfo(path, stats);
  }

  // ファイルのコピー
  async copyFile(sourcePath: string, destPath: string, options?: FileOperationOptions): Promise<void> {
    let flags = 0;
    if (!options?.overwrite) {
      flags |= fs.constants.COPYFILE_EXCL;
    }
    await copyFileAsync(sourcePath, destPath, flags);
    
    if (options?.preserveTimestamps) {
      const stats = await statAsync(sourcePath);
      await fs.promises.utimes(destPath, stats.atime, stats.mtime);
    }
  }

  copyFileSync(sourcePath: string, destPath: string, options?: FileOperationOptions): void {
    let flags = 0;
    if (!options?.overwrite) {
      flags |= fs.constants.COPYFILE_EXCL;
    }
    fs.copyFileSync(sourcePath, destPath, flags);
    
    if (options?.preserveTimestamps) {
      const stats = fs.statSync(sourcePath);
      fs.utimesSync(destPath, stats.atime, stats.mtime);
    }
  }

  // ファイルの移動/リネーム
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    await renameAsync(sourcePath, destPath);
  }

  moveFileSync(sourcePath: string, destPath: string): void {
    fs.renameSync(sourcePath, destPath);
  }

  // ファイルの削除
  async deleteFile(path: string): Promise<void> {
    await unlinkAsync(path);
  }

  deleteFileSync(path: string): void {
    fs.unlinkSync(path);
  }

  // ディレクトリの作成
  async createDirectory(path: string, options?: FileOperationOptions): Promise<void> {
    await mkdirAsync(path, {
      recursive: options?.recursive || false,
      mode: options?.mode
    });
  }

  createDirectorySync(path: string, options?: FileOperationOptions): void {
    fs.mkdirSync(path, {
      recursive: options?.recursive || false,
      mode: options?.mode
    });
  }

  // ディレクトリの読み取り
  async readDirectory(path: string): Promise<string[]> {
    return await readdirAsync(path);
  }

  readDirectorySync(path: string): string[] {
    return fs.readdirSync(path);
  }

  // ディレクトリ情報の取得
  async getDirectoryInfo(path: string, includeChildren?: boolean): Promise<DirectoryInfo> {
    const fileInfo = await this.getFileInfo(path);
    const children: FileInfo[] = [];
    
    if (includeChildren) {
      const childNames = await this.readDirectory(path);
      for (const childName of childNames) {
        const childPath = this.resolvePath(path, childName);
        try {
          const childInfo = await this.getFileInfo(childPath);
          children.push(childInfo);
        } catch (error) {
          // アクセスできないファイルはスキップ
          console.warn(`ファイル情報の取得に失敗: ${childPath}`, error);
        }
      }
    }
    
    return {
      ...fileInfo,
      children: includeChildren ? children : undefined,
      isEmpty: children.length === 0
    };
  }

  getDirectoryInfoSync(path: string, includeChildren?: boolean): DirectoryInfo {
    const fileInfo = this.getFileInfoSync(path);
    const children: FileInfo[] = [];
    
    if (includeChildren) {
      const childNames = this.readDirectorySync(path);
      for (const childName of childNames) {
        const childPath = this.resolvePath(path, childName);
        try {
          const childInfo = this.getFileInfoSync(childPath);
          children.push(childInfo);
        } catch (error) {
          console.warn(`ファイル情報の取得に失敗: ${childPath}`, error);
        }
      }
    }
    
    return {
      ...fileInfo,
      children: includeChildren ? children : undefined,
      isEmpty: children.length === 0
    };
  }

  // ディレクトリの削除
  async deleteDirectory(path: string, options?: FileOperationOptions): Promise<void> {
    if (options?.recursive) {
      // Node.js 14.14.0+では{ recursive: true, force: true }が使用可能
      await fs.promises.rmdir(path, { recursive: true });
    } else {
      await rmdirAsync(path);
    }
  }

  deleteDirectorySync(path: string, options?: FileOperationOptions): void {
    if (options?.recursive) {
      fs.rmdirSync(path, { recursive: true });
    } else {
      fs.rmdirSync(path);
    }
  }

  // パス操作
  resolvePath(...paths: string[]): string {
    return path.resolve(...paths);
  }

  normalizePath(path: string): string {
    return path.normalize(path);
  }

  isAbsolutePath(path: string): boolean {
    return path.isAbsolute(path);
  }

  getRelativePath(from: string, to: string): string {
    return path.relative(from, to);
  }

  getDirectoryName(path: string): string {
    return path.dirname(path);
  }

  getFileName(path: string): string {
    return path.basename(path);
  }

  getFileExtension(path: string): string {
    return path.extname(path);
  }

  getFileNameWithoutExtension(path: string): string {
    return path.basename(path, path.extname(path));
  }

  // ファイルウォッチャー
  async watchFile(path: string, callbacks: FileWatcherCallbacks): Promise<string> {
    const watcherId = `watch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const watcher = fs.watch(path, (eventType, filename) => {
        if (eventType === 'change' && callbacks.onChange) {
          this.getFileInfo(path).then(stats => {
            callbacks.onChange!(path, stats);
          }).catch(error => {
            callbacks.onError?.(error);
          });
        }
      });
      
      watcher.on('error', (error) => {
        callbacks.onError?.(error);
      });
      
      this.watchers.set(watcherId, watcher);
      return watcherId;
    } catch (error) {
      callbacks.onError?.(error as Error);
      throw error;
    }
  }

  async unwatchFile(watcherId: string): Promise<void> {
    const watcher = this.watchers.get(watcherId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(watcherId);
    }
  }

  // ファイル検索
  async findFiles(
    directory: string,
    pattern: string | RegExp,
    options?: {
      recursive?: boolean;
      includeDirectories?: boolean;
      maxDepth?: number;
    }
  ): Promise<string[]> {
    const results: string[] = [];
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    const searchDirectory = async (dir: string, currentDepth: number = 0) => {
      if (options?.maxDepth && currentDepth > options.maxDepth) {
        return;
      }
      
      try {
        const entries = await this.readDirectory(dir);
        
        for (const entry of entries) {
          const fullPath = this.resolvePath(dir, entry);
          const info = await this.getFileInfo(fullPath);
          
          if (info.isFile || (options?.includeDirectories && info.isDirectory)) {
            if (regex.test(entry)) {
              results.push(fullPath);
            }
          }
          
          if (info.isDirectory && options?.recursive) {
            await searchDirectory(fullPath, currentDepth + 1);
          }
        }
      } catch (error) {
        console.warn(`ディレクトリの検索に失敗: ${dir}`, error);
      }
    };
    
    await searchDirectory(directory);
    return results;
  }

  // 一時ファイル作成
  async createTempFile(prefix?: string, suffix?: string): Promise<string> {
    const tempDir = os.tmpdir();
    const fileName = `${prefix || 'temp'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${suffix || '.tmp'}`;
    const tempPath = this.resolvePath(tempDir, fileName);
    
    await this.writeFile(tempPath, '');
    return tempPath;
  }

  async createTempDirectory(prefix?: string): Promise<string> {
    const tempDir = os.tmpdir();
    const dirName = `${prefix || 'temp'}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const tempPath = this.resolvePath(tempDir, dirName);
    
    await this.createDirectory(tempPath);
    return tempPath;
  }

  // ファイルロック（簡化された実装）
  async lockFile(path: string, options?: { timeout?: number }): Promise<string> {
    const lockId = `lock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const lockPath = `${path}.lock`;
    
    // 簡単なロックファイル作成
    await this.writeFile(lockPath, lockId);
    return lockId;
  }

  async unlockFile(lockId: string): Promise<void> {
    // 実際の実装ではロックファイルを削除
    console.log(`ファイルロックを解除: ${lockId}`);
  }

  // ファイルサイズ
  async getFileSize(path: string): Promise<number> {
    const info = await this.getFileInfo(path);
    return info.size;
  }

  async getDirectorySize(path: string): Promise<number> {
    let totalSize = 0;
    
    const calculateSize = async (dir: string) => {
      const entries = await this.readDirectory(dir);
      
      for (const entry of entries) {
        const fullPath = this.resolvePath(dir, entry);
        const info = await this.getFileInfo(fullPath);
        
        if (info.isFile) {
          totalSize += info.size;
        } else if (info.isDirectory) {
          await calculateSize(fullPath);
        }
      }
    };
    
    await calculateSize(path);
    return totalSize;
  }

  // ファイルハッシュ
  async calculateFileHash(path: string, algorithm: 'md5' | 'sha1' | 'sha256' = 'sha256'): Promise<string> {
    const crypto = require('crypto');
    const data = await this.readFile(path);
    const hash = crypto.createHash(algorithm);
    hash.update(data);
    return hash.digest('hex');
  }

  // バックアップ
  async createBackup(sourcePath: string, backupDirectory?: string): Promise<string> {
    const backupDir = backupDirectory || this.getDirectoryName(sourcePath);
    const fileName = this.getFileName(sourcePath);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${this.getFileNameWithoutExtension(fileName)}.${timestamp}.backup${this.getFileExtension(fileName)}`;
    const backupPath = this.resolvePath(backupDir, backupFileName);
    
    await this.copyFile(sourcePath, backupPath, { preserveTimestamps: true });
    return backupPath;
  }

  async restoreBackup(backupPath: string, targetPath: string): Promise<void> {
    await this.copyFile(backupPath, targetPath, { overwrite: true, preserveTimestamps: true });
  }

  // システムパス
  async getSystemPaths(): Promise<{
    home: string;
    temp: string;
    appData: string;
    documents: string;
    downloads: string;
    desktop: string;
  }> {
    const homedir = os.homedir();
    
    return {
      home: homedir,
      temp: os.tmpdir(),
      appData: process.platform === 'win32' 
        ? process.env.APPDATA || this.resolvePath(homedir, 'AppData', 'Roaming')
        : this.resolvePath(homedir, '.local', 'share'),
      documents: this.resolvePath(homedir, 'Documents'),
      downloads: this.resolvePath(homedir, 'Downloads'),
      desktop: this.resolvePath(homedir, 'Desktop')
    };
  }

  // プライベートメソッド
  private statsToFileInfo(filePath: string, stats: fs.Stats): FileInfo {
    return {
      path: filePath,
      name: this.getFileName(filePath),
      extension: this.getFileExtension(filePath),
      size: stats.size,
      createdAt: stats.birthtime,
      modifiedAt: stats.mtime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      permissions: {
        readable: true, // 簡化した実装
        writable: true,
        executable: true
      }
    };
  }
}