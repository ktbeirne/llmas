# 技術的負債解消タスク一覧

**作成日**: 2025年6月5日  
**形式**: チェックボックス式タスクリスト

このドキュメントは実際の作業進捗を追跡するためのチェックリストです。

---

## 🎯 FSD移行決定により更新

**重要**: Feature-Sliced Design移行が最高優先として決定されました。

### 📁 FSD移行ドキュメント参照
詳細な実行計画は以下のドキュメントを参照：
- **[docs/fsd-migration/MIGRATION_PLAN.md](./fsd-migration/MIGRATION_PLAN.md)** - 詳細移行計画
- **[docs/fsd-migration/MIGRATION_CHECKLIST.md](./fsd-migration/MIGRATION_CHECKLIST.md)** - 進捗チェックリスト
- **[docs/fsd-migration/MIGRATION_TICKETS.md](./fsd-migration/MIGRATION_TICKETS.md)** - 実装チケット

### 🔄 技術的負債の状況変化

#### 自動解決される負債（FSD移行により）
- **TD-001**: マウス追従アーキテクチャ違反 → features/mouse-follow/で解決
- **TD-002**: MascotStateManager不適切配置 → イベント駆動で解決  
- **TD-003**: アニメーション判定ハードコーディング → features/animation/で解決

#### 並行対応すべき負債
- **TD-008**: ESLint設定エラー（FSD移行Phase 0で対応）
- **TD-009**: any型過剰使用（FSD移行と並行）
- **TD-010**: テストカバレッジ（FSD移行と並行）

## 🚨 Week 0: FSD移行Phase 0（緊急対応）

### 🟡 Priority 2: 並行対応（TD-008）

### ESLint設定エラーとLinter警告の解消

#### TD-008-01: ESLint設定の修正
- [ ] react-hooksプラグインのインストール確認
- [ ] eslint.config.jsのプラグイン設定修正
- [ ] package.jsonの依存関係確認
- [ ] ESLint実行テスト
- [ ] CI/CDでのLint動作確認

#### TD-008-02: console文の整理
- [ ] logger.tsサービスの改善
- [ ] console.logの使用箇所リストアップ（130箇所）
- [ ] 開発環境でのみ出力する仕組み実装
- [ ] 本番環境での出力制御確認
- [ ] 50ファイル分のconsole文置換（第1弾）
- [ ] 50ファイル分のconsole文置換（第2弾）
- [ ] 30ファイル分のconsole文置換（第3弾）
- [ ] 回帰テストの実行

#### TD-008-03: Lintルールの最適化
- [ ] no-consoleルールの段階的有効化
- [ ] 警告レベルの調整
- [ ] ignoreファイルの更新
- [ ] チーム向けドキュメント作成
- [ ] README.mdのLint情報更新

---

## 🔴 Week 1: 型安全性（TD-009）

### any型の過剰使用の解消

#### TD-009-01: 型定義ファイルの作成
- [ ] src/types/events.ts 作成
- [ ] src/types/api.ts 作成
- [ ] src/types/electron.ts 作成
- [ ] React.MouseEvent, ChangeEvent等の定義
- [ ] 既存コードとの互換性テスト

#### TD-009-02: イベントハンドラーの型付け
- [ ] onClick系ハンドラー（20箇所）の型付け
- [ ] onChange系ハンドラー（15箇所）の型付け
- [ ] onSubmit系ハンドラー（10箇所）の型付け
- [ ] カスタムイベントの型定義
- [ ] 型推論の活用
- [ ] any型削除確認（目標: 50%削減）

#### TD-009-03: APIレスポンスの型付け
- [ ] Gemini APIレスポンスの型定義
- [ ] Electron IPC通信の型定義
- [ ] エラーレスポンスの型定義
- [ ] 型ガードの実装
- [ ] Zodによるランタイム検証
- [ ] any型削除確認（目標: 30%削減）

#### TD-009-04: 残存any型の段階的解消
- [ ] 優先度リストの作成
- [ ] 高優先度箇所の型付け（20箇所）
- [ ] 中優先度箇所の型付け（20箇所）
- [ ] unknown型への移行（10箇所）
- [ ] 型アサーションの最小化
- [ ] 最終確認（目標: 50ファイル以下に削減）

---

## 🟡 Week 2: テストカバレッジ（TD-010）

### テストカバレッジの不均衡解消

#### TD-010-01: テスト戦略の策定
- [ ] 重要度によるファイル分類
- [ ] テストタイプの定義（Unit/Integration/E2E）
- [ ] カバレッジ目標設定（70%以上）
- [ ] docs/TESTING_STRATEGY.md 作成
- [ ] 実装計画の詳細化

#### TD-010-02: 重要サービスのテスト作成
- [ ] VRMSetupManager.test.ts 作成
- [ ] MouseFollowOrchestrator.test.ts 作成
- [ ] ChatHandler.test.ts 作成
- [ ] SettingsHandler.test.ts 作成
- [ ] ApplicationService.test.ts 作成
- [ ] エッジケースのテスト追加
- [ ] モックの適切な実装
- [ ] カバレッジ測定（目標: 70%以上）

#### TD-010-03: 統合テストの追加
- [ ] IPC通信の統合テスト
- [ ] マウス追従の統合テスト
- [ ] VRM制御の統合テスト
- [ ] 設定管理の統合テスト
- [ ] エラー伝播のテスト
- [ ] 実環境に近い条件でのテスト

#### TD-010-04: CI/CDでのカバレッジ監視
- [ ] .github/workflows/test.yml 更新
- [ ] カバレッジレポート設定
- [ ] PRへの自動レポート表示
- [ ] 閾値以下での警告設定
- [ ] カバレッジ履歴の可視化

---

## 🏗️ Week 3-4: アーキテクチャ改善（TD-001, TD-002）

### マウス追従機能のクリーンアーキテクチャ準拠

#### TD-001-01: MousePositionエンティティの作成
- [ ] src/domain/entities/MousePosition.test.ts 作成
- [ ] src/domain/entities/MousePosition.ts 作成
- [ ] スクリーン座標の保持
- [ ] タイムスタンプの実装
- [ ] 座標妥当性検証
- [ ] 距離計算メソッド
- [ ] テストカバレッジ100%確認

#### TD-001-02: HeadOrientationバリューオブジェクトの作成
- [ ] src/domain/value-objects/HeadOrientation.test.ts 作成
- [ ] src/domain/value-objects/HeadOrientation.ts 作成
- [ ] Pitch/Yaw/Rollの保持
- [ ] 角度制限の実装
- [ ] Quaternion変換
- [ ] スムージング計算
- [ ] テストカバレッジ100%確認

#### TD-001-03: MouseFollowDomainServiceの作成
- [ ] src/domain/services/MouseFollowDomainService.test.ts 作成
- [ ] src/domain/services/MouseFollowDomainService.ts 作成
- [ ] マウス位置から頭部方向計算
- [ ] 首と頭の回転比率適用（70:30）
- [ ] 回転制限の適用
- [ ] ビジネスロジックの集約
- [ ] テストカバレッジ100%確認

#### TD-001-04: ゲートウェイインターフェースの定義
- [ ] src/domain/gateways/IMousePositionGateway.ts 作成
- [ ] src/domain/gateways/IVRMControlGateway.ts 作成
- [ ] マウス位置取得インターフェース
- [ ] VRM制御インターフェース
- [ ] エラー処理の定義
- [ ] 非同期処理の考慮

#### TD-001-05: ElectronMousePositionGatewayの実装
- [ ] src/infrastructure/gateways/ElectronMousePositionGateway.test.ts 作成
- [ ] src/infrastructure/gateways/ElectronMousePositionGateway.ts 作成
- [ ] screen.getCursorScreenPoint()のラップ
- [ ] エラーハンドリング実装
- [ ] マルチディスプレイ対応
- [ ] モック可能な実装
- [ ] テストカバレッジ100%確認

#### TD-001-06: VRMControlGatewayAdapterの実装
- [ ] src/infrastructure/adapters/VRMControlGatewayAdapter.test.ts 作成
- [ ] src/infrastructure/adapters/VRMControlGatewayAdapter.ts 作成
- [ ] 既存VRMControllerのラップ
- [ ] ボーン制御の抽象化
- [ ] エラーハンドリング実装
- [ ] テストカバレッジ100%確認

#### TD-001-07: MouseFollowUseCaseの実装
- [ ] src/application/use-cases/MouseFollowUseCase.test.ts 作成
- [ ] src/application/use-cases/MouseFollowUseCase.ts 作成
- [ ] ユースケースのオーケストレーション
- [ ] 状態管理との連携
- [ ] 開始/停止制御
- [ ] エラーハンドリング実装
- [ ] テストカバレッジ100%確認

#### TD-001-08: DIContainerの更新
- [ ] src/infrastructure/DIContainer.ts 更新
- [ ] 新規クラスの登録
- [ ] 依存関係の設定
- [ ] 初期化順序の考慮
- [ ] 既存機能への影響確認

#### TD-001-09: VRMSetupManagerのリファクタリング
- [ ] マウス追従ロジックの削除
- [ ] MouseFollowUseCaseへの委譲
- [ ] 既存機能の維持確認
- [ ] 回帰テストの実行
- [ ] パフォーマンステスト

### MascotStateManagerの適切な配置

#### TD-002-01: MascotStateエンティティの作成
- [ ] src/domain/entities/MascotState.test.ts 作成
- [ ] src/domain/entities/MascotState.ts 作成
- [ ] 状態の定義（表情、アニメーション、スピーチバブル）
- [ ] 状態遷移ルール実装
- [ ] アイドル判定ロジック
- [ ] テストカバレッジ100%確認

#### TD-002-02: MascotStateDomainServiceの作成
- [ ] src/domain/services/MascotStateDomainService.test.ts 作成
- [ ] src/domain/services/MascotStateDomainService.ts 作成
- [ ] 状態管理ロジックの実装
- [ ] イベント通知メカニズム
- [ ] 状態の一貫性保証
- [ ] テストカバレッジ100%確認

#### TD-002-03: 既存MascotStateManagerのリファクタリング
- [ ] シングルトンから依存性注入への変更
- [ ] ドメインサービスへの委譲
- [ ] 既存APIの維持
- [ ] DIContainerへの統合
- [ ] 回帰テストの実行

---

## 🟢 Week 5: 設定UI（TD-005）

### 設定UIの実装

#### TD-005-01: MouseFollowSettingsTabコンポーネントの作成
- [ ] src/renderer/components/settings/MouseFollowSettingsTab.test.tsx 作成
- [ ] src/renderer/components/settings/MouseFollowSettingsTab.tsx 作成
- [ ] ON/OFFトグルスイッチ
- [ ] 感度調整スライダー
- [ ] スムージング設定スライダー
- [ ] リアルタイムプレビュー機能
- [ ] テストカバレッジ80%以上確認

#### TD-005-02: 設定の永続化実装
- [ ] src/utils/settingsStore.ts 更新
- [ ] マウス追従設定の追加
- [ ] デフォルト値の管理
- [ ] 型安全性の確保
- [ ] 既存設定との互換性確認

#### TD-005-03: IPCハンドラーの実装
- [ ] src/main/ipc/handlers/MouseFollowHandler.ts 作成
- [ ] IPCチャンネルの定義
- [ ] 設定の同期機能
- [ ] リアルタイム更新
- [ ] エラーハンドリング実装
- [ ] テストカバレッジ80%以上確認

---

## 📋 その他のタスク（TD-003, TD-004）

### アニメーション判定の改善

#### TD-003-01: AnimationConfigエンティティの作成
- [ ] src/domain/entities/AnimationConfig.test.ts 作成
- [ ] src/domain/entities/AnimationConfig.ts 作成
- [ ] アニメーション設定の定義
- [ ] カテゴリー管理（idle, action等）
- [ ] 設定の検証ロジック
- [ ] テストカバレッジ100%確認

#### TD-003-02: AnimationCategoryServiceの実装
- [ ] src/domain/services/AnimationCategoryService.test.ts 作成
- [ ] src/domain/services/AnimationCategoryService.ts 作成
- [ ] カテゴリー判定ロジック
- [ ] 設定ベースの判定
- [ ] デフォルト値の管理
- [ ] テストカバレッジ100%確認

#### TD-003-03: VRMControllerの更新
- [ ] src/vrmController.ts ハードコーディング削除
- [ ] AnimationCategoryServiceの使用
- [ ] 既存機能の維持確認
- [ ] 回帰テストの実行

### 既存機能のテスト作成

#### TD-004-01: VRMSetupManagerのテスト作成
- [ ] src/services/vrmSetupManager.test.ts 更新
- [ ] 主要メソッドのテスト
- [ ] エッジケースのカバー
- [ ] モックの適切な使用
- [ ] カバレッジ80%以上確認

#### TD-004-02: MascotStateManagerのテスト作成
- [ ] src/services/MascotStateManager.test.ts 更新
- [ ] 全パブリックメソッドのテスト
- [ ] 状態遷移のテスト
- [ ] イベント通知のテスト
- [ ] カバレッジ90%以上確認

#### TD-004-03: マウス追従E2Eテストの作成
- [ ] tests/e2e/mouse-follow/mouse-follow-integration.spec.ts 作成
- [ ] 基本的なマウス追従動作テスト
- [ ] 状態による制御のテスト
- [ ] エラーケースのテスト
- [ ] スクリーンショット取得

---

## 📊 進捗追跡

### 完了率

- **TD-008 (緊急)**: □□□□□ 0/15 (0%)
- **TD-009 (型安全)**: □□□□□□□□□□□□□□□□□□□□ 0/20 (0%)
- **TD-010 (テスト)**: □□□□□□□□□□□□□□□ 0/15 (0%)
- **TD-001 (アーキテクチャ)**: □□□□□□□□□□□□□□□□□□□□□□□□□□□□□□ 0/30 (0%)
- **TD-002 (状態管理)**: □□□□□□□□□□ 0/10 (0%)
- **TD-005 (設定UI)**: □□□□□□□□□□ 0/10 (0%)
- **TD-003 (アニメーション)**: □□□□□□ 0/6 (0%)
- **TD-004 (既存テスト)**: □□□□□□□□ 0/8 (0%)
- **TD-015 (アーキテクチャ移行)**: □□□□□□□□□□□□□□ 0/14 (0%)

### 週別目標

- **Week 0**: TD-008完了（15タスク）
- **Week 1**: TD-009完了（20タスク）
- **Week 2**: TD-010完了（15タスク）
- **Week 3**: TD-001前半完了（15タスク）
- **Week 4**: TD-001後半、TD-002完了（25タスク）
- **Week 5**: TD-005、TD-003、TD-004完了（24タスク）
- **Week 6-8**: TD-015段階的移行（14タスク）

**総計**: 128タスク

---

**使用方法**: 各タスク完了時に `[ ]` を `[x]` に変更してください。