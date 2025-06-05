# FEAT-010 VRMボーン操作実験（Experimental）

**作成日**: 2025-01-06  
**更新日**: 2025-01-06  
**ステータス**: Planning  
**優先度**: P1  
**見積もり**: S (1週間) - Phase 1のみ  
**担当者**: 未定  

## 概要

VRMモデルのボーンを直接操作してプリセットポーズを作成できるかの技術検証。単一および複数ボーンの操作を検証し、将来的なポーズシステムの実現可能性を探る実験的機能。

## ユーザーストーリー

```
As a 開発者
I want to VRMモデルのボーンを直接操作できるか検証したい
So that 将来的にユーザーがマスコットに様々なポーズを取らせられる機能を実装できる
```

## 詳細要件

### Phase 1: 技術検証（このチケットのスコープ）

#### 検証項目

1. **単一ボーン操作**
   - 特定ボーンへのアクセス方法の確立
   - 右腕（rightUpperArm, rightLowerArm）の回転
   - 首（neck）の回転
   - ボーン角度の制限値の調査

2. **複数ボーン連携操作**
   - 両手を同時に上げる
   - 手を振るモーション（肩・肘・手首の連携）
   - 複雑なポーズ（片手を腰に、もう片手を上げる）
   - ボーン間の親子関係の考慮

3. **技術的検証**
   - ボーン階層構造の解析
   - 複数ボーン同時操作時のパフォーマンス測定
   - 既存アニメーション（VRMA）との競合確認
   - ボーン操作の補間処理（スムーズな遷移）
   - 物理演算（揺れもの）への影響

#### 成果物

- 検証用デバッグUI（開発者向け）
- ボーン操作のプロトタイプコード
- 技術検証レポート（Markdownドキュメント）
- 制限事項と推奨事項のまとめ

### 非機能要件

- パフォーマンス: 60fps維持（ボーン操作中）
- 開発効率: Three.js InspectorやGUI連携
- 実験的機能: プロダクションコードへの影響を最小限に

## 技術的考慮事項

### アーキテクチャへの影響

- 影響を受けるFeature: 
  - `features/vrm-control/` - ボーン制御機能の追加
- 新規作成が必要なコンポーネント:
  - BoneController（実験的）
  - DebugBoneUI（開発ツール）
- 依存関係: 
  - Three.js Skeleton/Bone API
  - @pixiv/three-vrm の humanoid

### 実装方針（実験的）

```
features/
└── vrm-control/
    └── experimental/           # 実験的機能用ディレクトリ
        ├── bone-controller.ts  # ボーン操作ロジック
        ├── pose-definitions.ts # ポーズ定義（将来用）
        └── debug-bone-ui.ts    # デバッグUI

src/
└── services/
    └── experimental/
        └── BoneDebugPanel.ts   # 開発者向けデバッグパネル
```

### 検証用コード例

```typescript
// ボーンアクセスの例
const vrm = await loadedVRM;
const humanoid = vrm.humanoid;
const rightUpperArm = humanoid.getBoneNode('rightUpperArm');

// 単一ボーン操作
rightUpperArm.rotation.z = Math.PI / 4; // 45度回転

// 複数ボーン連携
const leftUpperArm = humanoid.getBoneNode('leftUpperArm');
leftUpperArm.rotation.z = -Math.PI / 4;
```

## 受け入れ条件

- [ ] VRMモデルから特定のボーンを取得できる
- [ ] 単一ボーンの回転操作が可能
- [ ] 複数ボーンを同時に操作できる
- [ ] デバッグUIでリアルタイムにボーン操作できる
- [ ] アニメーション再生中でもボーン操作が可能
- [ ] パフォーマンスへの影響を測定・文書化
- [ ] 技術的制限事項を文書化
- [ ] 検証コードがexperimentalとして隔離されている

## UI/UXデザイン（開発者向け）

### デバッグパネル

```
[VRM Bone Debug Panel]

ボーン選択:
[rightUpperArm ▼]

回転制御:
X: [-180°|-----●-----|+180°] 45°
Y: [-180°|---●-------|+180°] 0°
Z: [-180°|-------●---|+180°] 90°

プリセット（実験）:
[右手を上げる] [両手を上げる] [手を振る]

[リセット] [現在の値をコピー]
```

## テスト計画

### 検証項目

- [ ] 各ボーンへのアクセステスト
- [ ] 回転値の範囲制限テスト
- [ ] 複数ボーン同時操作のテスト
- [ ] アニメーションとの共存テスト
- [ ] パフォーマンステスト（FPS測定）
- [ ] エッジケース（極端な角度等）

### 検証環境

- 複数のVRMモデルでテスト
- 異なるボーン構造のモデルでの動作確認

## リスクと軽減策

| リスク | 影響度 | 軽減策 |
|--------|--------|--------|
| VRMモデルによってボーン構造が異なる | High | VRM仕様の標準ボーンのみ操作対象とする |
| アニメーションとの競合 | Medium | 優先度システムの設計、ボーン操作モードの切り替え |
| 不自然なポーズによる見た目の問題 | Low | ボーン角度の制限値を設定 |
| パフォーマンスの劣化 | Medium | 操作対象ボーンを限定、最適化 |

## 実装メモ

### 2025-01-06
- 初期仕様策定
- 実験的機能としてPhase 1（技術検証）のみをスコープに
- 将来的なPhase 2（プリセットシステム）、Phase 3（統合）は別チケット

## 将来の展望（Phase 2以降）

- JSONベースのポーズ定義システム
- ポーズのプリセット機能（5-10種類）
- ユーザー定義ポーズの保存・読み込み
- チャットキーワードによるポーズトリガー
- IK（Inverse Kinematics）の導入検討

## 関連リンク

- 関連Issue: #
- 関連PR: #
- 参考資料:
  - [VRM Humanoid仕様](https://github.com/vrm-c/vrm-specification/blob/master/specification/VRMC_vrm-1.0/humanoid.md)
  - [Three.js Skeleton](https://threejs.org/docs/#api/en/objects/Skeleton)
  - Three.js Bone Manipulation Examples