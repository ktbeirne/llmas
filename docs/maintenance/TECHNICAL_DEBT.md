# 技術的負債リスト

**作成日**: 2025年6月5日  
**更新日**: 2025年6月5日  
**ステータス**: ⚠️ FSD移行決定により大幅変更

## 🎯 重要な決定事項

**2025年6月5日: Feature-Sliced Design移行が最高優先として決定**

この技術的負債分析の結果、Clean Architectureからの移行が必要と判断されました。

### 📁 最新の移行計画
- **[docs/fsd-migration/MIGRATION_PLAN.md](./fsd-migration/MIGRATION_PLAN.md)** - 詳細移行計画
- **[docs/fsd-migration/FSD_ARCHITECTURE_DESIGN.md](./fsd-migration/FSD_ARCHITECTURE_DESIGN.md)** - 新アーキテクチャ設計
- **[docs/fsd-migration/MIGRATION_TICKETS.md](./fsd-migration/MIGRATION_TICKETS.md)** - 実装チケット

### 📊 負債解決見込み
FSD移行により以下の技術的負債が**自動解決**されます：
- TD-001, TD-002, TD-003 → アーキテクチャ変更により根本解決
- TD-004, TD-005 → 大幅改善
- その他 → 並行対応または改善

このドキュメントは、プロジェクトに蓄積された技術的負債を追跡し、将来的なリファクタリングの優先順位を決定するためのものです。

---

## 🚨 高優先度の技術的負債

### TD-001: マウス追従機能のアーキテクチャ違反 (Issue #60)

**違反内容**:
- Clean Architectureの層構造を無視した実装
- VRMSetupManagerに直接機能を追加（責務の肥大化）
- ドメイン層の欠如
- インフラ層のAPIを直接呼び出し

**具体的な問題**:
```typescript
// ❌ 現在の実装
class VRMSetupManager {
  private startGlobalMouseTracking() {
    // Electron APIを直接呼び出し
    const cursorPos = screen.getCursorScreenPoint();
  }
}
```

**リファクタリング方針**:
- [ ] MousePositionエンティティの作成
- [ ] HeadOrientationバリューオブジェクトの作成
- [ ] IMousePositionGatewayインターフェースの定義
- [ ] MouseFollowUseCaseの実装
- [ ] ElectronMousePositionGatewayの実装
- [ ] DIContainerへの登録

**影響範囲**: 高  
**推定工数**: 2-3日

---

### TD-002: MascotStateManagerの不適切な配置

**違反内容**:
- ドメインロジックがサービス層に存在
- グローバルシングルトンの使用
- テストが困難な実装

**リファクタリング方針**:
- [ ] MascotStateドメインエンティティの作成
- [ ] 状態管理ロジックのドメインサービス化
- [ ] 依存性注入の適用

**影響範囲**: 中  
**推定工数**: 1-2日

---

### TD-003: アイドルアニメーション判定のハードコーディング

**違反内容**:
- VRMController内でアニメーション名をハードコーディング
- 設定不可能な実装

**具体的な問題**:
```typescript
// ❌ 現在の実装
const isIdleAnimation = !clip.name || 
                       clip.name === '' || 
                       clip.name.toLowerCase().includes('idle') ||
                       clip.name === 'Take 001' ||
                       clip.name === 'mixamo.com' ||
                       clip.name === 'Clip';
```

**リファクタリング方針**:
- [ ] AnimationConfigエンティティの作成
- [ ] 設定ファイルベースの判定システム
- [ ] AnimationCategoryバリューオブジェクトの実装

**影響範囲**: 低  
**推定工数**: 1日

---

## ⚠️ 中優先度の技術的負債

### TD-004: テストカバレッジの不足

**問題点**:
- マウス追従機能のユニットテストが存在しない
- MascotStateManagerのテストが不足
- E2Eテストの未実装

**必要なテスト**:
- [ ] VRMSetupManager.startGlobalMouseTracking()のテスト
- [ ] MascotStateManager全メソッドのテスト
- [ ] マウス追従E2Eテスト

**推定工数**: 2日

---

### TD-005: 設定UIの未実装

**問題点**:
- マウス追従のON/OFF切り替え不可
- 感度調整機能なし
- スムージング設定なし

**実装項目**:
- [ ] 設定画面へのマウス追従タブ追加
- [ ] 設定値の永続化
- [ ] リアルタイム設定反映

**推定工数**: 2日

---

## 📋 低優先度の技術的負債

### TD-006: パフォーマンス最適化の余地

**改善可能な点**:
- マウストラッキング頻度の動的調整
- 不要な再レンダリングの削減
- メモリ使用量の最適化

---

### TD-007: エラーハンドリングの改善

**問題点**:
- screen.getCursorScreenPoint()のエラー処理が不十分
- ボーン取得失敗時の処理が単純

---

### TD-008: ESLint設定エラーとLinter警告の大量発生

**違反内容**:
- ESLint設定ファイルでreact-hooksプラグインのエラー
- console.log/warn/errorが130ファイルで使用
- no-consoleルールが無効化されている

**影響範囲**: 高  
**推定工数**: 1日

---

### TD-009: any型の過剰使用

**違反内容**:
- 113ファイルでany型を使用
- 型安全性の欠如
- コンパイル時エラー検出の機会損失

**具体的な例**:
```typescript
// 多くのイベントハンドラーで
onClick: (e: any) => void
// APIレスポンスで
const response: any = await fetch(...)
```

**影響範囲**: 高  
**推定工数**: 3-4日

---

### TD-010: テストカバレッジの不均衡

**問題点**:
- 実装ファイル158個に対してテストファイル79個（50%）
- 一部のサービスにテストが存在しない
- 新規実装（マウス追従関連）のテスト欠如

**影響範囲**: 高  
**推定工数**: 5日

---

## 📋 低優先度の技術的負債

### TD-011: デバッグコードの残存

**問題点**:
- 本番環境に不要なconsole.log文
- デバッグ用の一時的なコード
- コメントアウトされた古いコード

**影響範囲**: 低  
**推定工数**: 1日

---

### TD-012: import文の整理不足

**問題点**:
- import順序の不統一
- 未使用importの残存
- 相対パスと絶対パスの混在

**影響範囲**: 低  
**推定工数**: 0.5日

---

### TD-013: 廃止予定APIの使用

**問題点**:
- Electron APIの古いバージョン使用
- React 19で非推奨となるパターン
- Three.jsの古いAPI使用

**影響範囲**: 中  
**推定工数**: 2日

---

### TD-014: ドキュメントの不整合

**問題点**:
- コードとドキュメントの乖離
- JSDocコメントの不足
- README.mdの更新漏れ

**影響範囲**: 低  
**推定工数**: 2日

---

### TD-015: Feature-Sliced Design + イベント駆動への移行

**問題点**:
- デスクトップアプリにクリーンアーキテクチャが過剰適用
- 実用性のない抽象化レイヤー（Repository, Gateway等）
- 開発効率の著しい低下（1機能追加に10ファイル作成）
- マウス追従機能でアーキテクチャを自然と回避した実例

**具体的な違反例**:
```typescript
// ❌ 現在：過剰な抽象化
src/domain/gateways/IMousePositionGateway.ts
src/infrastructure/gateways/ElectronMousePositionGateway.ts
src/application/use-cases/MouseFollowUseCase.ts
src/domain/services/MouseFollowDomainService.ts
// → 1機能に4層、10ファイル

// ✅ 提案：Feature-Sliced Design
src/features/mouse-follow/
├── ui/          # React コンポーネント
├── model/       # ビジネスロジック
└── lib/         # ユーティリティ
// → 1機能に1フォルダ、3-4ファイル
```

**移行方針**:
1. **段階的移行**: 既存機能を壊さずに新構造を並行導入
2. **新機能優先**: 今後の新機能はFeature-Sliced Designで実装
3. **イベント駆動**: コンポーネント間の疎結合化
4. **漸進的削除**: 古いClean Architecture構造の段階的削除

**期待される効果**:
- 開発速度3-5倍向上
- 新規開発者の学習コスト削減
- コードベースの可読性向上
- 保守性の向上

**影響範囲**: 最高（全コードベース）  
**推定工数**: 6-8週間（段階的移行）

---

## 📊 技術的負債の要約

| カテゴリ | 件数 | 推定総工数 |
|---------|------|-----------|
| 最高優先度 | 1件 | 2-3ヶ月 |
| 高優先度 | 6件 | 13-16日 |
| 中優先度 | 3件 | 6日 |
| 低優先度 | 5件 | 5.5日 |

**短期合計推定工数**: 24.5-27.5日  
**長期アーキテクチャ改善**: 2-3ヶ月

---

## 🔄 改善計画

### Phase 1: アーキテクチャ修正（3-4日）
1. ドメイン層の実装
2. 依存性逆転の適用
3. DIContainerの更新

### Phase 2: テスト追加（2日）
1. ユニットテスト作成
2. 統合テスト作成
3. E2Eテスト作成

### Phase 3: 機能拡張（2-3日）
1. 設定UI実装
2. アニメーション判定の改善
3. パフォーマンス最適化

---

## 📝 教訓

この技術的負債から学んだこと：

1. **アーキテクチャファースト**: 実装前に必ずARCHITECTURE_V2.mdを参照
2. **TDD厳守**: テストなしの実装は絶対に避ける
3. **責務分離**: 既存サービスへの機能追加は慎重に検討
4. **設計レビュー**: 実装前に設計の妥当性を確認

---

**次回レビュー日**: リファクタリング開始時