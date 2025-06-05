# FEAT-009 リップシンク機能（タイプライターエフェクト連動）

**作成日**: 2025-01-06  
**更新日**: 2025-01-06  
**ステータス**: Completed  
**優先度**: P1  
**見積もり**: S (3-5日)  
**担当者**: 完了  

## 概要

AIの応答がタイプライターエフェクトで表示される際に、VRMモデルの口を動かして話しているように見せる機能。テキスト内容の解析は行わず、文字表示のタイミングに合わせて口の形状を切り替える簡易的な実装。

## ユーザーストーリー

```
As a ユーザー
I want to マスコットが話している時に口が動くのを見たい
So that よりリアルで生き生きとしたインタラクションを体験できる
```

## 詳細要件

### 機能要件

1. タイプライターエフェクトで文字が表示されている間、口の形状モーフを切り替える
2. 句読点（。、！？）で一時的に口を閉じる
3. テキスト表示完了後は口を閉じた状態に戻る
4. 口の動きは既存の表情モーフ（aa, ih, ou, ee, oh）を活用

### 非機能要件

- パフォーマンス: 口の動きがカクつかないよう、60fps以上を維持
- 互換性: 既存の表情システムと競合しないこと
- 拡張性: 将来的なTTS統合を考慮した設計

## 技術的考慮事項

### アーキテクチャへの影響

- 影響を受けるFeature: 
  - `features/chat/` - タイプライターエフェクトとの連携
  - `features/vrm-control/` - 表情制御の拡張
- 新規作成が必要なFeature: なし（既存機能の拡張）
- 依存関係: ExpressionManagerとの協調動作が必要

### 実装方針

FSDに基づく実装計画：

```
features/
├── chat/
│   └── lib/
│       └── typewriter-events.ts  # 口パクイベントの発火
└── vrm-control/
    └── lib/
        ├── lip-sync-manager.ts   # 口パク制御ロジック
        └── expression-manager.ts  # 既存（拡張）
```

### API変更

- 新規イベント: 
  - `typewriter:character` - 文字表示時
  - `typewriter:pause` - 句読点での一時停止
  - `typewriter:complete` - 表示完了
- 内部API: `LipSyncManager`クラスの追加

## 受け入れ条件

- [x] タイプライターエフェクトと同期して口が動く
- [x] 句読点で自然に口が閉じる
- [x] 表示完了後は口を閉じた状態になる
- [x] 他の表情（happy, sadなど）と競合しない
- [x] パフォーマンスの劣化がない（60fps維持）
- [x] ユニットテストが書かれている
- [x] 設定で口パクのON/OFFが可能

## UI/UXデザイン

### 口パクパターン例
```
通常: aa → ih → ou → ee → oh → aa... (ループ)
句読点: 現在の形 → デフォルト（閉じた口）
完了: デフォルト表情に戻る
```

### 設定UI
設定画面に「リップシンク」トグルを追加

## テスト計画

### ユニットテスト

- [x] LipSyncManagerの各メソッドのテスト
- [x] イベントハンドリングのテスト
- [x] 表情競合時の優先度テスト（ExpressionComposerで実装）

### 統合テスト

- [x] Chat機能との連携テスト
- [x] 長文表示時のパフォーマンステスト
- [x] E2Eテスト（視覚的な確認）

## リスクと軽減策

| リスク | 影響度 | 軽減策 |
|--------|--------|--------|
| 他の表情との競合 | Medium | 優先度システムを実装し、感情表現を優先 |
| パフォーマンス劣化 | Low | requestAnimationFrameで最適化 |
| 不自然な動き | Low | 適切な切り替え間隔の調整（100-150ms） |

## 実装メモ

### 2025-01-06
- 初期仕様策定
- 将来的なTTS統合を考慮し、イベントベースの設計を採用
- TDDアプローチで実装
  - LipSyncManagerのテストを先に作成
  - 基本実装完了
  - Speech Bubble → Main Process → Main Windowの通信パス確立
- 実装内容:
  - `LipSyncManager`クラス: 口パク制御ロジック
  - IPC通信: `lip-sync-event`チャンネル
  - Speech Bubbleのタイプライター連携: start/pause/stop通知
  - 設定機能: リップシンクON/OFF
- 実装ファイル:
  - `/src/features/vrm-control/lib/lip-sync-manager.ts`
  - `/src/features/vrm-control/lib/lip-sync-manager.test.ts`
  - `/renderer/speech_bubble/renderer.ts` - タイプライター連携
  - `/src/main/ipc/handlers/VRMHandler.ts` - IPC処理
  - `/src/widgets/mascot-view/model/mascot-integration.ts` - 統合

### 表情合成システム統合（ExpressionComposer）
- FSD Entitiesレイヤーに`ExpressionComposer`を実装
  - `/src/entities/vrm-expression-composer/` - 表情合成エンジン
  - BlendShapeのカテゴリ別管理（emotional, mouth, eye, gaze）
  - 競合解決と優先度管理
- `LipSyncManagerV2`を実装し、ExpressionComposerと統合
  - `/src/features/vrm-control/lib/lip-sync-manager-v2.ts`
  - 口の動きと他の表情（感情表現など）の同時表示を実現
  - リップシンク中でも感情表現を維持
- 統合のポイント:
  - ExpressionComposerがすべての表情を統合管理
  - LipSyncManagerV2は口カテゴリのみを更新
  - まばたきや感情表現との自然な共存を実現
- デバッグログの削除とパフォーマンス最適化完了

## 関連リンク

- 関連Issue: #
- 関連PR: #
- 設計ドキュメント: 
- 参考資料: 
  - FEAT-002 音声合成機能（将来的な統合候補）