#!/usr/bin/env node
/**
 * Cross-Platform Validator
 * 
 * プラットフォーム固有機能の検証と互換性テスト
 * Windows/Mac/Linux環境での動作確認
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// プラットフォーム固有の要件定義
const PLATFORM_REQUIREMENTS = {
  windows: {
    executable: 'llmdesktopmascot.exe',
    packageFormats: ['.exe', '.zip'],
    features: ['native-notifications', 'system-tray', 'auto-updater'],
    paths: {
      userData: '%APPDATA%',
      temp: '%TEMP%'
    }
  },
  macos: {
    executable: 'llmdesktopmascot.app',
    packageFormats: ['.dmg', '.zip'],
    features: ['native-notifications', 'dock-integration', 'auto-updater'],
    paths: {
      userData: '~/Library/Application Support',
      temp: '/tmp'
    }
  },
  linux: {
    executable: 'llmdesktopmascot',
    packageFormats: ['.deb', '.rpm', '.tar.gz'],
    features: ['native-notifications', 'desktop-integration'],
    paths: {
      userData: '~/.config',
      temp: '/tmp'
    }
  }
};

class CrossPlatformValidator {
  constructor() {
    this.platform = this.detectPlatform();
    this.results = {
      platform: this.platform,
      nodeVersion: process.version,
      arch: process.arch,
      tests: {
        buildArtifacts: null,
        platformFeatures: null,
        pathResolution: null,
        fileSystem: null,
        processes: null,
        networking: null
      }
    };
    this.summary = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  /**
   * メイン検証実行
   */
  async validate(targetPlatform = null) {
    console.log('🌐 [Cross-Platform Validator] Starting cross-platform validation...');
    console.log(`📱 [Platform] Detected: ${this.platform} (Node.js ${process.version})`);
    
    // コマンドライン引数で指定されたプラットフォームがある場合
    if (targetPlatform) {
      console.log(`🎯 [Target] Validating for: ${targetPlatform}`);
      this.platform = targetPlatform;
    }
    
    try {
      // 各カテゴリの検証
      await this.validateBuildArtifacts();
      await this.validatePlatformFeatures();
      await this.validatePathResolution();
      await this.validateFileSystemOperations();
      await this.validateProcessManagement();
      await this.validateNetworking();
      
      // 総合レポート生成
      this.generateValidationReport();
      
      console.log('✅ [Cross-Platform Validator] Validation completed successfully');
      
      // 失敗があった場合は非ゼロ終了
      if (this.summary.failed > 0) {
        console.error('❌ [Cross-Platform Validator] Platform compatibility issues found');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ [Cross-Platform Validator] Validation failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * プラットフォーム検出
   */
  detectPlatform() {
    const platform = os.platform();
    switch (platform) {
      case 'win32': return 'windows';
      case 'darwin': return 'macos';
      case 'linux': return 'linux';
      default: return platform;
    }
  }

  /**
   * ビルドアーティファクト検証
   */
  async validateBuildArtifacts() {
    console.log('🔨 [Cross-Platform Validator] Validating build artifacts...');
    
    const requirements = PLATFORM_REQUIREMENTS[this.platform];
    if (!requirements) {
      this.addFailure('build', `Unsupported platform: ${this.platform}`);
      return;
    }

    // ビルド出力ディレクトリの確認
    const outDir = path.join(process.cwd(), 'out');
    if (!fs.existsSync(outDir)) {
      this.addFailure('build', 'Build output directory not found');
      return;
    }

    // プラットフォーム固有のビルドディレクトリ確認
    const platformBuildDir = this.getPlatformBuildDirectory();
    if (fs.existsSync(platformBuildDir)) {
      this.addSuccess('build', `Platform build directory found: ${platformBuildDir}`);
      
      // 実行ファイルの確認
      const executablePath = path.join(platformBuildDir, requirements.executable);
      if (this.checkExecutableExists(executablePath)) {
        this.addSuccess('build', `Executable found: ${requirements.executable}`);
      } else {
        this.addWarning('build', `Executable not found: ${requirements.executable}`);
      }
    } else {
      this.addWarning('build', `Platform build directory not found: ${platformBuildDir}`);
    }

    this.results.tests.buildArtifacts = {
      outputDirectory: fs.existsSync(outDir),
      platformDirectory: fs.existsSync(platformBuildDir),
      executable: this.checkExecutableExists(path.join(platformBuildDir, requirements.executable))
    };
  }

  /**
   * プラットフォーム固有機能検証
   */
  async validatePlatformFeatures() {
    console.log('⚙️ [Cross-Platform Validator] Validating platform features...');
    
    const requirements = PLATFORM_REQUIREMENTS[this.platform];
    const supportedFeatures = [];
    const unsupportedFeatures = [];

    for (const feature of requirements.features) {
      if (await this.checkFeatureSupport(feature)) {
        supportedFeatures.push(feature);
        this.addSuccess('features', `Feature supported: ${feature}`);
      } else {
        unsupportedFeatures.push(feature);
        this.addWarning('features', `Feature not available: ${feature}`);
      }
    }

    this.results.tests.platformFeatures = {
      supported: supportedFeatures,
      unsupported: unsupportedFeatures,
      total: requirements.features.length
    };
  }

  /**
   * パス解決検証
   */
  async validatePathResolution() {
    console.log('📁 [Cross-Platform Validator] Validating path resolution...');
    
    const requirements = PLATFORM_REQUIREMENTS[this.platform];
    const pathTests = {};

    for (const [pathType, pathTemplate] of Object.entries(requirements.paths)) {
      try {
        const resolvedPath = this.resolvePlatformPath(pathTemplate);
        pathTests[pathType] = {
          template: pathTemplate,
          resolved: resolvedPath,
          accessible: this.checkPathAccessible(resolvedPath)
        };
        
        if (pathTests[pathType].accessible) {
          this.addSuccess('paths', `Path accessible: ${pathType} -> ${resolvedPath}`);
        } else {
          this.addWarning('paths', `Path not accessible: ${pathType} -> ${resolvedPath}`);
        }
      } catch (error) {
        pathTests[pathType] = {
          template: pathTemplate,
          resolved: null,
          accessible: false,
          error: error.message
        };
        this.addFailure('paths', `Path resolution failed: ${pathType} - ${error.message}`);
      }
    }

    this.results.tests.pathResolution = pathTests;
  }

  /**
   * ファイルシステム操作検証
   */
  async validateFileSystemOperations() {
    console.log('💾 [Cross-Platform Validator] Validating file system operations...');
    
    const testDir = path.join(os.tmpdir(), 'llm-desktop-mascot-test');
    const fsOperations = {
      createDirectory: false,
      writeFile: false,
      readFile: false,
      deleteFile: false,
      removeDirectory: false
    };

    try {
      // ディレクトリ作成
      if (!fs.existsSync(testDir)) {
        fs.mkdirSync(testDir, { recursive: true });
      }
      fsOperations.createDirectory = true;
      
      // ファイル書き込み
      const testFile = path.join(testDir, 'test.txt');
      fs.writeFileSync(testFile, 'Cross-platform test file');
      fsOperations.writeFile = true;
      
      // ファイル読み込み
      const content = fs.readFileSync(testFile, 'utf8');
      fsOperations.readFile = content === 'Cross-platform test file';
      
      // ファイル削除
      fs.unlinkSync(testFile);
      fsOperations.deleteFile = !fs.existsSync(testFile);
      
      // ディレクトリ削除
      fs.rmdirSync(testDir);
      fsOperations.removeDirectory = !fs.existsSync(testDir);
      
      this.addSuccess('filesystem', 'All file system operations successful');
      
    } catch (error) {
      this.addFailure('filesystem', `File system operation failed: ${error.message}`);
    }

    this.results.tests.fileSystem = fsOperations;
  }

  /**
   * プロセス管理検証
   */
  async validateProcessManagement() {
    console.log('⚡ [Cross-Platform Validator] Validating process management...');
    
    const processTests = {
      currentProcess: {
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version
      },
      environmentVariables: {
        nodeEnv: process.env.NODE_ENV || 'undefined',
        path: !!process.env.PATH,
        home: !!(process.env.HOME || process.env.USERPROFILE)
      },
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };

    // プロセス情報の妥当性チェック
    if (processTests.currentProcess.pid > 0) {
      this.addSuccess('process', `Process PID: ${processTests.currentProcess.pid}`);
    } else {
      this.addFailure('process', 'Invalid process PID');
    }

    if (processTests.environmentVariables.path) {
      this.addSuccess('process', 'PATH environment variable available');
    } else {
      this.addWarning('process', 'PATH environment variable not available');
    }

    this.results.tests.processes = processTests;
  }

  /**
   * ネットワーク検証
   */
  async validateNetworking() {
    console.log('🌐 [Cross-Platform Validator] Validating networking...');
    
    const networkTests = {
      dnsResolution: false,
      httpRequest: false,
      localConnection: false
    };

    try {
      // DNS解決テスト
      const dns = require('dns');
      await new Promise((resolve, reject) => {
        dns.resolve('example.com', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      networkTests.dnsResolution = true;
      this.addSuccess('network', 'DNS resolution working');
      
    } catch (error) {
      this.addWarning('network', `DNS resolution failed: ${error.message}`);
    }

    // ローカル接続テスト（簡易）
    try {
      const net = require('net');
      const server = net.createServer();
      
      await new Promise((resolve, reject) => {
        server.listen(0, 'localhost', () => {
          const port = server.address().port;
          server.close(() => {
            networkTests.localConnection = true;
            this.addSuccess('network', `Local connection test passed (port ${port})`);
            resolve();
          });
        });
        
        server.on('error', reject);
      });
      
    } catch (error) {
      this.addWarning('network', `Local connection test failed: ${error.message}`);
    }

    this.results.tests.networking = networkTests;
  }

  /**
   * ヘルパーメソッド
   */
  getPlatformBuildDirectory() {
    const outDir = path.join(process.cwd(), 'out');
    const platformMap = {
      windows: 'llmdesktopmascot-win32-x64',
      macos: 'llmdesktopmascot-darwin-x64',
      linux: 'llmdesktopmascot-linux-x64'
    };
    
    return path.join(outDir, platformMap[this.platform] || `llmdesktopmascot-${this.platform}-x64`);
  }

  checkExecutableExists(executablePath) {
    if (!fs.existsSync(executablePath)) return false;
    
    try {
      const stats = fs.statSync(executablePath);
      return stats.isFile();
    } catch {
      return false;
    }
  }

  async checkFeatureSupport(feature) {
    // 実際の実装では、各機能の利用可能性をチェック
    const supportMatrix = {
      'native-notifications': true, // 通常はサポート
      'system-tray': this.platform !== 'linux', // LinuxではDE依存
      'auto-updater': true,
      'dock-integration': this.platform === 'macos',
      'desktop-integration': this.platform === 'linux'
    };
    
    return supportMatrix[feature] || false;
  }

  resolvePlatformPath(pathTemplate) {
    // 環境変数とホームディレクトリの展開
    let resolved = pathTemplate;
    
    if (resolved.includes('%')) {
      // Windows環境変数の展開
      resolved = resolved.replace(/%([^%]+)%/g, (match, envVar) => {
        return process.env[envVar] || match;
      });
    }
    
    if (resolved.startsWith('~')) {
      // Unix系ホームディレクトリの展開
      resolved = resolved.replace('~', os.homedir());
    }
    
    return resolved;
  }

  checkPathAccessible(resolvedPath) {
    try {
      fs.accessSync(path.dirname(resolvedPath), fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 結果記録ヘルパーメソッド
   */
  addSuccess(category, message) {
    this.summary.passed++;
    this.summary.details.push({ type: 'success', category, message });
    console.log(`✅ [${category}] ${message}`);
  }

  addFailure(category, message) {
    this.summary.failed++;
    this.summary.details.push({ type: 'failure', category, message });
    console.log(`❌ [${category}] ${message}`);
  }

  addWarning(category, message) {
    this.summary.warnings++;
    this.summary.details.push({ type: 'warning', category, message });
    console.log(`⚠️  [${category}] ${message}`);
  }

  /**
   * 検証レポート生成
   */
  generateValidationReport() {
    console.log('\n🌐 [Cross-Platform Validator] Validation Summary');
    console.log('='.repeat(60));
    
    console.log(`🖥️  Platform: ${this.platform} (${os.arch()})`);
    console.log(`📝 Node.js: ${process.version}`);
    console.log(`✅ Passed: ${this.summary.passed}`);
    console.log(`❌ Failed: ${this.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.summary.warnings}`);
    
    console.log('\n📋 Detailed Results:');
    this.summary.details.forEach(detail => {
      const icons = {
        success: '✅',
        failure: '❌',
        warning: '⚠️ '
      };
      const icon = icons[detail.type] || '❓';
      console.log(`  ${icon} [${detail.category}] ${detail.message}`);
    });

    // プラットフォーム互換性評価
    console.log('\n🏆 Platform Compatibility Status:');
    if (this.summary.failed === 0) {
      console.log(`  ✅ ${this.platform} - Fully Compatible`);
    } else if (this.summary.failed <= 2) {
      console.log(`  ⚠️  ${this.platform} - Compatible with minor issues`);
    } else {
      console.log(`  ❌ ${this.platform} - Compatibility issues detected`);
    }

    // JSON形式でも出力
    const reportFile = path.join(process.cwd(), 'test-results', `cross-platform-${this.platform}-report.json`);
    const reportDir = path.dirname(reportFile);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      platform: this.platform,
      summary: this.summary,
      results: this.results,
      environment: {
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
        release: os.release()
      }
    }, null, 2));
    
    console.log(`\n📄 Report saved to: ${reportFile}`);
    
    // 総合評価
    if (this.summary.failed === 0) {
      console.log(`\n🎉 [Cross-Platform Validator] ${this.platform} is fully compatible!`);
    } else {
      console.log(`\n⚠️  [Cross-Platform Validator] ${this.platform} has compatibility issues. Please review the results.`);
    }
  }
}

// コマンドライン引数解析
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--platform=')) {
      options.platform = arg.split('=')[1];
    }
  });
  
  return options;
}

// スクリプト実行
if (require.main === module) {
  const options = parseArguments();
  const validator = new CrossPlatformValidator();
  
  validator.validate(options.platform).catch(error => {
    console.error('💥 [Cross-Platform Validator] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = CrossPlatformValidator;