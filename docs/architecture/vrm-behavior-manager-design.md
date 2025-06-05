# VRMBehaviorManager設計書

**作成日**: 2025年1月5日  
**アーキテクチャ**: Feature-Sliced Design (FSD)  
**目的**: VRM関連の振る舞い管理の一元化と循環依存の解決

---

## 概要

VRMBehaviorManagerは、VRM表情管理（ExpressionManager）、リップシンク管理（LipSyncManager）、アニメーション管理（AnimationManager）間の競合を解決し、統一された振る舞い制御を提供するエンティティレイヤーのコンポーネントです。

### 解決する課題

1. **循環依存問題**: ExpressionManager ↔ LipSyncManager の相互参照
2. **表情競合問題**: Function Call表情がリップシンクでオーバーライドされる
3. **状態管理の分散**: 各マネージャーで独立した状態管理
4. **優先度管理の欠如**: 表情の重要度に基づく制御がない

## アーキテクチャ設計

### 層配置

```
entities/vrm-behavior/
├── index.ts                    # Public API
├── model/
│   ├── vrm-behavior-manager.ts # コアロジック
│   └── expression-priority.ts  # 優先度管理
├── types/
│   └── index.ts               # 型定義
└── lib/
    └── priority-calculator.ts  # 優先度計算ロジック
```

### 依存関係

```
VRMBehaviorManager (entities)
    ↓ 依存
ExpressionManager, LipSyncManager, AnimationManager (features)
    ↓ 依存
VRM, EventBus (shared)
```

## 詳細設計

### 1. 表情優先度システム

```typescript
enum ExpressionPriority {
  LOW = 1,        // アイドル表情、自動まばたき
  MEDIUM = 2,     // リップシンク、通常の表情変化
  HIGH = 3,       // ユーザー指定表情、設定変更
  CRITICAL = 4    // Function Call表情、システム重要表情
}
```

### 2. VRMBehaviorManager インターフェース

```typescript
interface VRMBehaviorManager {
  // 初期化
  initialize(vrm: VRM): Promise<void>;
  
  // 表情制御
  setExpression(name: string, intensity: number, priority: ExpressionPriority): boolean;
  clearExpression(name: string): void;
  
  // リップシンク制御
  startLipSync(): void;
  pauseLipSync(): void;
  stopLipSync(): void;
  
  // アニメーション制御
  playAnimation(animationUrl: string): Promise<boolean>;
  stopAnimation(): void;
  
  // 状態管理
  getCurrentState(): VRMBehaviorState;
  
  // 更新・破棄
  update(delta: number): void;
  dispose(): void;
}
```

### 3. 状態管理

```typescript
interface VRMBehaviorState {
  activeExpressions: Map<string, ExpressionData>;
  lipSyncActive: boolean;
  currentAnimation: string | null;
  lastUpdate: number;
}

interface ExpressionData {
  name: string;
  intensity: number;
  priority: ExpressionPriority;
  timestamp: number;
  source: 'user' | 'system' | 'lipsync' | 'animation';
}
```

## 実装計画

### Phase 1: 基盤構築
1. **エンティティ構造作成**
   - `src/entities/vrm-behavior/` ディレクトリ作成
   - 型定義とインターフェース実装
   - 優先度システム実装

### Phase 2: コア機能実装
1. **VRMBehaviorManager実装**
   - 表情優先度管理
   - リップシンク制御統合
   - アニメーション制御統合

### Phase 3: 既存コード統合
1. **MascotIntegration更新**
   - VRMBehaviorManagerをインスタンス化
   - 既存のマネージャー呼び出しを委譲に変更
   - 循環依存の除去

### Phase 4: テスト・検証
1. **TDD実装**
   - 優先度システムのユニットテスト
   - 表情競合シナリオテスト
   - リップシンク統合テスト

## 設計チェックリスト確認

### ✅ FSD層構造遵守
- [x] entities層への適切な配置
- [x] 上位層から下位層への依存
- [x] Feature間の直接依存回避
- [x] Public API (index.ts) 設計

### ✅ 依存関係設計
- [x] シングルトン回避（DI による注入）
- [x] グローバル変数禁止
- [x] 依存注入設計
- [x] 循環依存回避（entities層による仲介）
- [x] Interface分離原則

### ✅ 状態管理設計
- [x] 状態最小化（必要な表情データのみ）
- [x] 正規化（Map による重複回避）
- [x] 責任範囲明確化（VRMBehaviorManager が所有）
- [x] Event-driven（Event bus 経由の通知）
- [x] 不変性（状態変更の予測可能性）

### ✅ エラーハンドリング設計
- [x] 早期失敗（初期化時のVRM検証）
- [x] 具体的エラー（表情名・優先度の詳細ログ）
- [x] 回復可能性（フォールバック表情）
- [x] ログ設計（優先度競合の追跡）

### ✅ テスタビリティ設計
- [x] 単体テスト（モック可能な依存注入）
- [x] モック境界（Manager interfaces）
- [x] 決定論的（priority-based 制御）
- [x] 副作用分離（Event emission）

## 実装後の効果

### 解決される問題
1. **循環依存解消**: entities層による仲介で一方向依存
2. **表情競合解決**: 優先度システムによる適切な制御
3. **状態管理統一**: 単一責任による明確な状態所有
4. **保守性向上**: FSD原則に従った明確な責任分離

### パフォーマンス向上
1. **不要な表情更新削減**: 優先度チェックによる最適化
2. **メモリ使用量削減**: 統一された状態管理
3. **デバッグ性向上**: 集約されたログと状態追跡

---

**注意事項**: 実装時は必ずTDDを実践し、各Phase完了時にテストを実行してください。既存の機能に影響を与えないよう、段階的な移行を行います。