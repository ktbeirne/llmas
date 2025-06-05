# VRM表情合成システム設計書

**作成日**: 2025年1月5日  
**アーキテクチャ**: Feature-Sliced Design (FSD)  
**目的**: VRM表情とリップシンクの同時実行による自然な表現の実現

---

## 📋 設計チェックリスト確認済み

### ✅ 問題分析
- **現在の制限**: ExpressionManagerが他の表情をリセットする設計
- **VRM仕様**: 異なるBlendShapeは独立して制御可能
- **技術的可能性**: 感情表情（目・眉）とリップシンク（口）の同時実行

### ✅ 目標
- 表情をつけたまま口パクを可能にする
- VRM本来の能力を最大活用
- 自然な表現（微笑みながら話すなど）

---

## 🏗️ アーキテクチャ設計

### FSD層構造遵守

**✅ 適切な層配置**
```
entities/vrm-expression-composer/          # エンティティ層（VRM仕様の抽象化）
├── index.ts                              # Public API
├── model/
│   ├── expression-composer.ts            # 表情合成エンジン
│   ├── blendshape-manager.ts             # BlendShape分離管理
│   └── composition-strategy.ts           # 合成戦略
├── types/
│   └── index.ts                         # 型定義
└── lib/
    ├── blendshape-classifier.ts          # BlendShape分類器
    └── composition-calculator.ts         # 合成計算

features/vrm-control/                     # 従来のVRM制御（更新）
├── lib/
│   ├── expression-manager.ts            # 合成システム統合
│   └── lip-sync-manager.ts              # 合成システム統合
```

**✅ 依存方向**
```
Features (vrm-control) → Entities (vrm-expression-composer) → Shared
```

**✅ Feature独立性**: expression-composerはvrm-controlに依存しない

### 依存関係設計

**✅ シングルトン回避**: 全てのクラスをインスタンス化
**✅ 依存注入**: VRMインスタンスを外部から注入
**✅ 循環依存回避**: 一方向依存のみ
**✅ Interface分離**: 各責任に対応したインターフェース分離

### 状態管理設計

**✅ 状態最小化**: 必要最小限のBlendShape状態のみ
**✅ 正規化**: BlendShape種別ごとに分離管理
**✅ 責任範囲**: ExpressionComposerが状態所有者として明確
**✅ Event-driven**: 表情変更イベントを発行
**✅ 不変性**: 状態変更は予測可能なAPI経由のみ

---

## 🎯 詳細設計

### 1. 表情分類システム

```typescript
enum BlendShapeCategory {
  EMOTIONAL = 'emotional',    // happy, sad, angry, surprised
  MOUTH = 'mouth',           // aa, ih, ou, ee, oh, neutral
  EYE = 'eye',              // blink, blinkLeft, blinkRight
  GAZE = 'gaze',            // lookUp, lookDown, lookLeft, lookRight
  CUSTOM = 'custom'         // その他のカスタム表情
}

interface BlendShapeClassification {
  category: BlendShapeCategory;
  canCombine: BlendShapeCategory[];  // 組み合わせ可能なカテゴリ
  priority: number;                  // 同カテゴリ内の優先度
}
```

### 2. 表情合成エンジン

```typescript
interface ExpressionComposer {
  // BlendShapeカテゴリ別設定
  setEmotional(name: string, intensity: number): void;
  setMouth(shape: string, intensity: number): void;
  setEye(name: string, intensity: number): void;
  setGaze(direction: string, intensity: number): void;
  
  // 合成と適用
  compose(): ComposedExpression;
  applyToVRM(vrm: VRM): void;
  
  // 状態管理
  getComposition(): ExpressionComposition;
  clearCategory(category: BlendShapeCategory): void;
  reset(): void;
}

interface ExpressionComposition {
  emotional: Map<string, number>;
  mouth: Map<string, number>;
  eye: Map<string, number>;
  gaze: Map<string, number>;
  custom: Map<string, number>;
  lastComposed: number;
}
```

### 3. BlendShape管理

```typescript
interface BlendShapeManager {
  // BlendShape分類
  classifyExpression(name: string): BlendShapeClassification;
  
  // カテゴリ別制御
  setBlendShape(category: BlendShapeCategory, name: string, value: number): void;
  getBlendShape(category: BlendShapeCategory, name: string): number;
  
  // 競合解決
  resolveConflicts(composition: ExpressionComposition): Map<string, number>;
  
  // VRM適用
  applyToVRM(vrm: VRM, resolvedBlendShapes: Map<string, number>): void;
}
```

### 4. 合成戦略

```typescript
interface CompositionStrategy {
  name: string;
  combine(
    emotional: Map<string, number>,
    mouth: Map<string, number>,
    eye: Map<string, number>,
    gaze: Map<string, number>
  ): Map<string, number>;
}

// 実装例
class AdditiveCompositionStrategy implements CompositionStrategy {
  // 加算合成（デフォルト）
}

class WeightedCompositionStrategy implements CompositionStrategy {
  // 重み付け合成（カスタム）
}
```

---

## 🔧 技術固有設計

### Three.js/VRM最適化

**✅ フレームレート**: 60fps維持
- BlendShape変更の差分更新のみ
- 不必要な合成計算をスキップ

**✅ メモリ制限**: 
- BlendShape状態をMapで効率管理
- 使用されていないBlendShapeは除外

**✅ リソース管理**:
- dispose()でリソース確実解放

### 非同期処理設計

**✅ Race condition回避**: 
- 合成処理をatomicに実行
- 状態変更は単一スレッドで処理

**✅ エラー境界**:
- VRM無効時の適切なフォールバック

---

## 🛡️ 品質・保守性設計

### エラーハンドリング設計

**✅ 早期失敗**: VRM・表情名の検証
**✅ 具体的エラー**: BlendShape名・カテゴリ情報含む
**✅ 回復可能性**: 無効表情は無視して続行
**✅ ログ設計**: 合成過程の詳細ログ

### テスタビリティ設計

**✅ 単体テスト**: 各コンポーネント独立テスト可能
**✅ モック境界**: VRM依存を分離
**✅ 決定論的**: 同じ入力で同じ合成結果
**✅ 副作用分離**: 合成計算とVRM適用を分離

### パフォーマンス設計

**✅ ボトルネック特定**: 合成計算が主要処理
**✅ キャッシュ戦略**: 合成結果をキャッシュ
**✅ レンダリング最適化**: 変更があった場合のみVRM更新

---

## 🎯 実装戦略

### Phase 1: 基盤構築
1. **BlendShape分類システム**: 表情カテゴリ判定
2. **型定義**: インターフェース・enum定義
3. **Public API**: index.ts設計

### Phase 2: コア実装
1. **ExpressionComposer**: 表情合成エンジン
2. **BlendShapeManager**: BlendShape管理
3. **CompositionStrategy**: 合成戦略

### Phase 3: 統合
1. **ExpressionManager更新**: 合成システム統合
2. **LipSyncManager更新**: 独立したMouth制御
3. **VRMBehaviorManager更新**: 合成システム利用

### Phase 4: 検証
1. **ユニットテスト**: 全コンポーネント
2. **統合テスト**: VRM実機テスト
3. **E2Eテスト**: Function Call + リップシンク

---

## ✅ 期待される効果

### 機能改善
- ✅ **Function Call表情 + リップシンク**: 同時実行可能
- ✅ **自然な表現**: 微笑みながら話すなど
- ✅ **VRM仕様活用**: 本来の能力を最大活用

### アーキテクチャ改善
- ✅ **責任分離**: 表情制御の明確な分離
- ✅ **拡張性**: 新しい合成戦略を追加可能
- ✅ **保守性**: テスト可能な独立コンポーネント

### パフォーマンス改善
- ✅ **効率的更新**: 差分更新による最適化
- ✅ **メモリ効率**: 必要最小限の状態管理

---

## 🚧 実装における注意点

### VRMモデル依存性
- BlendShape定義はモデル依存
- 事前のモデル検証が必要

### 既存システムとの互換性
- 段階的移行によるリスク軽減
- レガシーAPIの維持

### テスト戦略
- モックVRMでの単体テスト
- 実際のVRMモデルでの統合テスト

---

**📝 設計完了基準チェック**
- ✅ すべてのチェック項目をクリア
- ✅ 設計ドキュメント作成完了
- ✅ 実装方針の明確化
- ✅ テスト戦略の策定

**次のステップ**: 実装チェックリストに従ったTDD実装