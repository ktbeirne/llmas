# Performance Testing Documentation

## 概要

このドキュメントでは、LLMDesktopMascotプロジェクトのパフォーマンステスト自動化システムについて説明します。Phase 5.4の一環として、包括的なパフォーマンス監視とCI/CD統合が実装されています。

## テストカテゴリ

### 1. 起動パフォーマンステスト
- **目的**: アプリケーション起動時間とリソース使用量の監視
- **閾値**: 
  - 起動時間: < 3000ms
  - メモリ増加: < 100MB
- **実行コマンド**: `npm run test:perf:startup`

### 2. メモリ使用量テスト
- **目的**: メモリリークの検出と長期的なメモリ使用パターンの監視
- **閾値**:
  - メモリリーク率: < 10%
  - ヒープ増加: < 100MB
- **実行コマンド**: `npm run test:perf:memory`

### 3. E2Eパフォーマンステスト
- **目的**: ユーザーインタラクションのパフォーマンス測定
- **閾値**:
  - IPC応答時間: < 1000ms (10回の操作)
  - バッチ操作: < 5000ms
- **実行コマンド**: `npm run test:perf:e2e`

### 4. 統合ベンチマーク
- **目的**: コンポーネント間連携のパフォーマンス評価
- **閾値**:
  - ワークフロー時間: < 10000ms
  - 並行操作: < 2000ms
- **実行コマンド**: `npm run test:perf:integration`

## CI/CD統合

### GitHub Actions ワークフロー

#### 1. Performance Testing CI/CD (`.github/workflows/performance-testing.yml`)
- **トリガー**: Push, Pull Request, 日次スケジュール実行
- **マトリックス戦略**: Node.js 18.x, 20.x × 4つのテストスイート
- **実行環境**: Ubuntu + Xvfb (ヘッドレス)
- **アーティファクト**: テスト結果、HTMLレポート、パフォーマンスサマリー

#### 2. Performance Monitoring (`.github/workflows/performance-monitoring.yml`)
- **トリガー**: 6時間毎の自動実行
- **目的**: 継続的なパフォーマンス監視
- **出力**: パフォーマンスバッジデータ、監視結果

### ワークフロー構成

```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x]
    test-suite: 
      - startup-performance
      - memory-usage
      - e2e-performance
      - integration-benchmarks
```

## パフォーマンス分析

### 自動分析スクリプト (`scripts/analyze-performance.js`)

#### 機能
- テスト結果の自動解析
- 閾値との比較
- 回帰検出
- 総合レポート生成

#### 使用方法
```bash
# パフォーマンステスト実行
npm run test:performance

# 分析実行
npm run analyze:performance

# CI/CD統合実行
npm run test:perf:ci
```

#### 出力形式
- コンソール出力（リアルタイム）
- JSON形式レポート (`test-results/performance-analysis-report.json`)
- CI/CD用サマリー

### パフォーマンス閾値

```javascript
const PERFORMANCE_THRESHOLDS = {
  startup: {
    maxStartupTime: 3000,    // 3秒
    maxMemoryIncrease: 100,  // 100MB
  },
  ipc: {
    maxResponseTime: 1000,      // 1秒 (10回の操作)
    maxBatchResponseTime: 5000, // 5秒 (バッチ操作)
  },
  memory: {
    maxHeapIncrease: 104857600, // 100MB in bytes
    maxLeakRate: 0.1,           // 10%増加率
  },
  integration: {
    maxWorkflowTime: 10000,        // 10秒
    maxConcurrentOperations: 2000, // 2秒
  }
};
```

## ローカル開発

### セットアップ
```bash
# 依存関係インストール
npm ci

# アプリケーションビルド
npm run build
npm run package
```

### パフォーマンステスト実行
```bash
# 全てのパフォーマンステスト
npm run test:performance

# 個別テスト
npm run test:perf:startup
npm run test:perf:memory
npm run test:perf:e2e
npm run test:perf:integration

# 分析付きテスト（推奨）
npm run test:perf:ci
```

### ヘッドレス環境（WSL/Linux）
```bash
# Xvfb使用
export DISPLAY=:99
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &

# ヘッドレステスト実行
npm run test:e2e:headless
```

## プル要求時のパフォーマンスチェック

### 自動チェック
1. **回帰検出**: 既存のベースラインとの比較
2. **閾値チェック**: 定義された性能基準との照合
3. **コメント自動投稿**: PRにパフォーマンス結果を表示

### 手動チェック
```bash
# プル要求前の確認
npm run test:perf:ci

# 結果確認
cat test-results/performance-analysis-report.json
```

## トラブルシューティング

### 一般的な問題

#### 1. Electronアプリケーションの起動失敗
```bash
# 依存関係の再インストール
npm ci

# ビルドの再実行
npm run build
npm run package
```

#### 2. ヘッドレス環境でのテスト失敗
```bash
# 仮想ディスプレイの確認
echo $DISPLAY
ps aux | grep Xvfb

# Xvfbの再起動
pkill Xvfb
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &
```

#### 3. パフォーマンス閾値超過
- アプリケーションコードの最適化を検討
- 閾値設定の見直し（必要に応じて）
- 具体的なボトルネックの特定

### ログとデバッグ

#### テスト結果の確認
```bash
# JSON形式レポート
cat test-results/performance-analysis-report.json

# Playwrightレポート
npx playwright show-report test-results/e2e-report
```

#### 詳細ログ
```bash
# デバッグモード
DEBUG=* npm run test:perf:ci

# Electronログ
ELECTRON_ENABLE_LOGGING=true npm run start
```

## 継続的改善

### パフォーマンス最適化のガイドライン
1. **起動時間最適化**: 遅延読み込み、並列初期化
2. **メモリ管理**: リークの防止、適切なクリーンアップ
3. **IPC最適化**: バッチ処理、効率的なシリアライゼーション
4. **UI応答性**: 非同期処理、プログレッシブロード

### 監視指標の拡張
- カスタム指標の追加
- ユーザー固有のパフォーマンス要件
- プラットフォーム別最適化

## 関連ファイル

- `.github/workflows/performance-testing.yml`: メインCI/CDワークフロー
- `.github/workflows/performance-monitoring.yml`: 継続監視ワークフロー
- `scripts/analyze-performance.js`: パフォーマンス分析スクリプト
- `src/tests/performance/`: パフォーマンステストスイート
- `tests/e2e/integration/comprehensive-integration.spec.ts`: 統合ベンチマーク

## 更新履歴

- **Phase 5.4**: 包括的パフォーマンステスト自動化システム実装
- CI/CD統合とGitHub Actions対応
- 自動分析とレポート生成機能追加
- マルチプラットフォーム対応（Node.js 18.x, 20.x）