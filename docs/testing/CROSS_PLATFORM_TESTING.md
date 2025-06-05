# Cross-Platform Testing Documentation

## 概要

このドキュメントでは、LLMDesktopMascotプロジェクトのクロスプラットフォーム対応とテスト自動化について説明します。Windows、macOS、Linux環境での動作確認と互換性検証を自動化します。

## サポートプラットフォーム

### 🐧 Linux
- **ディストリビューション**: Ubuntu 18.04+ / Debian 10+ / CentOS 7+ / Fedora 30+
- **アーキテクチャ**: x64, arm64
- **パッケージ形式**: .deb, .rpm, .tar.gz
- **特徴**:
  - ネイティブ通知サポート
  - デスクトップ統合 (freedesktop.org標準)
  - Xvfb対応ヘッドレステスト
  - システムトレイ統合

### 🪟 Windows
- **バージョン**: Windows 10 1903+ / Windows 11
- **アーキテクチャ**: x64, arm64
- **パッケージ形式**: .exe (NSIS), .zip
- **特徴**:
  - ネイティブ通知サポート
  - システムトレイ統合
  - 自動アップデーター
  - Windows固有UI適応

### 🍎 macOS
- **バージョン**: macOS 10.15 (Catalina)+
- **アーキテクチャ**: x64, arm64 (Apple Silicon)
- **パッケージ形式**: .dmg, .zip
- **特徴**:
  - ネイティブ通知サポート
  - Dock統合
  - 自動アップデーター
  - macOS固有機能統合

## テストアーキテクチャ

### GitHub Actions マトリックス戦略

```yaml
strategy:
  fail-fast: false
  matrix:
    os: [ubuntu-latest, windows-latest, macos-latest]
    node-version: [18.x, 20.x]
    include:
      - os: ubuntu-latest
        platform: linux
        display_setup: xvfb
      - os: windows-latest
        platform: windows
        display_setup: none
      - os: macos-latest
        platform: macos
        display_setup: none
```

### テストカテゴリ

#### 1. ビルドアーティファクト検証
- **目的**: プラットフォーム固有のビルド成果物確認
- **検証項目**:
  - ビルド出力ディレクトリ
  - プラットフォーム固有実行ファイル
  - パッケージ形式対応

#### 2. プラットフォーム固有機能
- **目的**: OS固有機能の利用可能性確認
- **検証項目**:
  - ネイティブ通知
  - システムトレイ統合
  - 自動アップデーター
  - デスクトップ統合

#### 3. パス解決とファイルシステム
- **目的**: OS固有のパス処理とファイル操作
- **検証項目**:
  - ユーザーデータディレクトリ
  - 一時ディレクトリ
  - ファイル権限
  - パス区切り文字

#### 4. プロセス管理
- **目的**: プロセス間通信とシステム統合
- **検証項目**:
  - 環境変数アクセス
  - プロセス識別子
  - メモリ使用量
  - システムリソース

#### 5. ネットワーク機能
- **目的**: ネットワーク接続と通信
- **検証項目**:
  - DNS解決
  - HTTP/HTTPS通信
  - ローカル接続
  - プロキシ設定

## CI/CD統合

### ワークフロー構成

#### 1. Cross-Platform Testing (`.github/workflows/cross-platform-testing.yml`)
- **トリガー**: Push, Pull Request, 週次スケジュール実行
- **マトリックス**: 3プラットフォーム × 2Node.jsバージョン
- **実行時間**: 最大45分
- **成果物**: プラットフォーム別互換性レポート

#### 2. 段階別テスト実行
```yaml
steps:
  - Platform-specific setup
  - Build verification
  - Unit tests
  - E2E tests
  - Feature validation
  - Performance benchmarks
  - Report generation
```

### 自動成果物生成

#### 互換性マトリックス
```markdown
| Platform | Node 18.x | Node 20.x | Build | Tests | Status |
|----------|-----------|-----------|-------|-------|--------|
| 🐧 Linux | ✅ | ✅ | ✅ | ✅ | 🟢 Fully Supported |
| 🪟 Windows | ✅ | ✅ | ✅ | ✅ | 🟢 Fully Supported |
| 🍎 macOS | ✅ | ✅ | ✅ | ✅ | 🟢 Fully Supported |
```

#### プラットフォーム別レポート
- JSON形式の詳細検証結果
- ビルド成果物の確認状況
- 機能サポート状況
- パフォーマンス指標

## ローカル開発

### セットアップ

#### Linux
```bash
# 依存関係インストール
sudo apt-get install -y xvfb libnss3-dev libatk-bridge2.0-dev

# 仮想ディスプレイ設定
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
```

#### Windows
```powershell
# Windows SDK and Visual Studio Build Tools
# 通常は自動インストール
```

#### macOS
```bash
# Xcode Command Line Tools
xcode-select --install
```

### クロスプラットフォームテスト実行

#### 全プラットフォーム検証
```bash
# 現在のプラットフォーム
npm run test:cross-platform

# プラットフォーム指定
npm run test:cross-platform:linux
npm run test:cross-platform:windows
npm run test:cross-platform:macos

# 分析実行
npm run analyze:cross-platform
```

#### プラットフォーム固有テスト
```bash
# Linux固有
export DISPLAY=:99 && npm run test:cross-platform:linux

# Windows固有（PowerShell）
$env:PLATFORM="windows"; npm run test:cross-platform:windows

# macOS固有
PLATFORM=macos npm run test:cross-platform:macos
```

## プラットフォーム固有の実装

### 設定ファイル

#### forge.config.ts - プラットフォーム別ビルド設定
```typescript
const config: ForgeConfig = {
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        // Windows .exe installer
      },
      platforms: ['win32']
    },
    {
      name: '@electron-forge/maker-dmg',
      config: {
        // macOS .dmg package
      },
      platforms: ['darwin']
    },
    {
      name: '@electron-forge/maker-deb',
      config: {
        // Linux .deb package
      },
      platforms: ['linux']
    }
  ]
};
```

### プラットフォーム検出

#### runtime-platform-detection.ts
```typescript
export function getPlatform(): 'windows' | 'macos' | 'linux' {
  switch (process.platform) {
    case 'win32': return 'windows';
    case 'darwin': return 'macos';
    case 'linux': return 'linux';
    default: throw new Error(`Unsupported platform: ${process.platform}`);
  }
}

export function getPlatformPaths() {
  const platform = getPlatform();
  const paths = {
    windows: {
      userData: path.join(os.homedir(), 'AppData', 'Roaming'),
      temp: os.tmpdir()
    },
    macos: {
      userData: path.join(os.homedir(), 'Library', 'Application Support'),
      temp: '/tmp'
    },
    linux: {
      userData: path.join(os.homedir(), '.config'),
      temp: '/tmp'
    }
  };
  
  return paths[platform];
}
```

## 互換性マトリックス

### 機能サポート状況

| 機能 | Linux | Windows | macOS | 備考 |
|------|-------|---------|-------|------|
| ネイティブ通知 | ✅ | ✅ | ✅ | 全プラットフォーム対応 |
| システムトレイ | ⚠️ | ✅ | ✅ | LinuxはDE依存 |
| 自動アップデーター | ❌ | ✅ | ✅ | Linux手動アップデート |
| デスクトップ統合 | ✅ | ⚠️ | ❌ | freedesktop.org標準 |
| Dock統合 | ❌ | ❌ | ✅ | macOS固有 |
| ウィンドウ管理 | ✅ | ✅ | ✅ | 全プラットフォーム対応 |

### パッケージ形式

| プラットフォーム | 推奨形式 | 代替形式 | インストーラー |
|------------------|----------|----------|----------------|
| Linux | .deb | .rpm, .tar.gz | APT, YUM |
| Windows | .exe | .zip | NSIS |
| macOS | .dmg | .zip | DMG Mount |

## トラブルシューティング

### 一般的な問題

#### 1. ビルド失敗

**Linux**:
```bash
# 依存関係不足
sudo apt-get install build-essential

# Python環境
npm config set python python3
```

**Windows**:
```powershell
# Visual Studio Build Tools
npm install --global windows-build-tools
```

**macOS**:
```bash
# Xcode問題
sudo xcode-select --reset
```

#### 2. E2Eテスト失敗

**Linux**:
```bash
# 仮想ディスプレイ問題
ps aux | grep Xvfb
pkill Xvfb && Xvfb :99 -screen 0 1024x768x24 &
```

**Windows**:
```powershell
# GPU問題
$env:ELECTRON_DISABLE_GPU="true"
```

**macOS**:
```bash
# 権限問題
sudo spctl --master-disable
```

#### 3. プラットフォーム固有エラー

**パス解決エラー**:
```typescript
// 安全なパス処理
const safePath = path.resolve(userPath);
if (!safePath.startsWith(expectedBase)) {
  throw new Error('Invalid path');
}
```

**権限エラー**:
```typescript
// プラットフォーム別権限チェック
async function checkPermissions(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK | fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}
```

## 継続的改善

### 監視指標
- **ビルド成功率**: プラットフォーム別
- **テスト実行時間**: パフォーマンス追跡
- **互換性エラー**: 新機能の影響評価
- **ユーザーフィードバック**: プラットフォーム固有問題

### 新プラットフォーム対応
1. **要件分析**: ターゲットプラットフォームの特徴調査
2. **PoC実装**: 基本機能の動作確認
3. **テスト拡張**: 新プラットフォーム用テスト追加
4. **CI/CD統合**: 自動テストパイプライン組み込み
5. **ドキュメント更新**: 新プラットフォーム対応情報

## 関連ファイル

- `.github/workflows/cross-platform-testing.yml`: メインCI/CDワークフロー
- `scripts/cross-platform-validator.js`: プラットフォーム検証スクリプト
- `forge.config.ts`: Electronビルド設定
- `package.json`: プラットフォーム別npmスクリプト
- `test-results/cross-platform-*-report.json`: プラットフォーム別レポート

## 更新履歴

- **Phase 5.4**: クロスプラットフォームテスト自動化システム実装
- GitHub Actions マトリックス戦略採用
- プラットフォーム固有機能検証自動化
- 互換性マトリックス生成機能追加
- Windows/macOS/Linux完全対応