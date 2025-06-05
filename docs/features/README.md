# Feature管理ガイド

## 概要

このディレクトリは、LLM Desktop Mascotプロジェクトの機能（Feature）管理を行うための場所です。Feature-Sliced Design (FSD)に基づいて、各機能の計画、設計、実装を追跡します。

## ディレクトリ構造

```
features/
├── README.md           # このファイル
├── backlog/           # 機能バックログとチケット管理
│   ├── FEATURE_BACKLOG.md  # 全体のバックログ
│   └── tickets/           # 個別のチケット
│       ├── TEMPLATE.md    # チケットテンプレート
│       └── active/        # 現在進行中のチケット
└── designs/              # 機能設計書
    └── [feature-name]_DESIGN.md
```

## ワークフロー

### 1. 新機能の提案

1. `backlog/FEATURE_BACKLOG.md`に機能を追加
2. 優先度とカテゴリを設定
3. 概要と期待される価値を記載

### 2. 機能の計画

1. `tickets/TEMPLATE.md`を使用して新しいチケットを作成
2. `tickets/active/[TICKET-ID]_[feature-name].md`として保存
3. 詳細な要件、受け入れ条件、技術的考慮事項を記載

### 3. 設計ドキュメント

1. 大規模な機能の場合、`designs/[feature-name]_DESIGN.md`を作成
2. アーキテクチャ、API設計、UI/UXデザインを文書化
3. FSDの原則に従った実装計画を含める

### 4. 実装と追跡

1. チケットのステータスを更新（Planning → In Progress → Review → Done）
2. 実装時の決定事項や変更をチケットに記録
3. 完了後、チケットを`tickets/completed/`に移動（将来的に作成）

## チケット命名規則

- 形式: `[TICKET-ID]_[feature-name].md`
- 例: `FEAT-001_mcp-integration.md`
- ID体系:
  - `FEAT-XXX`: 新機能
  - `ENH-XXX`: 既存機能の拡張
  - `FIX-XXX`: バグ修正
  - `REFACTOR-XXX`: リファクタリング

## 関連ドキュメント

- [FSD開発ガイド](../architecture/FSD_DEVELOPMENT_GUIDE.md) - FSDの実装方法
- [API仕様書](../development/API_SPECIFICATION.md) - APIの詳細仕様
- [設計チェックリスト](../development/DESIGN_CHECKLIST.md) - 設計時の確認事項