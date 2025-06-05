# LLM Desktop Mascot ドキュメントインデックス

**最終更新**: 2025年1月6日  
**アーキテクチャ**: Feature-Sliced Design (FSD)

---

## 📚 ドキュメント構造

```
docs/
├── architecture/        # アーキテクチャ設計
├── development/         # 開発ガイド・API仕様
├── features/           # 機能管理・バックログ
├── testing/            # テスト戦略・ガイド
├── configuration/      # 設定・カスタマイズ
├── maintenance/        # 保守・技術的負債
└── archive/            # 過去のドキュメント
```

---

## 🚀 クイックスタート

### 新規開発者向け
1. **[開発環境セットアップ](./development/DEVELOPER_GUIDE.md)** ⭐
2. **[FSDアーキテクチャ概要](./architecture/FSD_ARCHITECTURE.md)** ⭐
3. **[FSD開発ガイド](./architecture/FSD_DEVELOPMENT_GUIDE.md)** ⭐

### Claude Code利用者向け
- **[CLAUDE.md](../CLAUDE.md)** - プロジェクト固有の指示とコンテキスト

---

## 📂 ドキュメントカテゴリ

### 🏗️ アーキテクチャ (`architecture/`)
- **[FSD_ARCHITECTURE.md](./architecture/FSD_ARCHITECTURE.md)** - Feature-Sliced Design アーキテクチャ詳細
- **[FSD_DEVELOPMENT_GUIDE.md](./architecture/FSD_DEVELOPMENT_GUIDE.md)** - FSD実装ガイドライン
- **[BEST_PRACTICES.md](./architecture/BEST_PRACTICES.md)** - ベストプラクティス集
- **[PATTERNS.md](./architecture/PATTERNS.md)** - 実装パターン集

### 🛠️ 開発 (`development/`)
- **[DEVELOPER_GUIDE.md](./development/DEVELOPER_GUIDE.md)** - 開発環境構築とワークフロー
- **[API_SPECIFICATION.md](./development/API_SPECIFICATION.md)** - 完全なAPI仕様書
- **[DESIGN_CHECKLIST.md](./development/DESIGN_CHECKLIST.md)** - 設計時のチェックリスト
- **[IMPLEMENTATION_CHECKLIST.md](./development/IMPLEMENTATION_CHECKLIST.md)** - 実装時のチェックリスト

### 🎯 機能管理 (`features/`)
- **[README.md](./features/README.md)** - Feature管理ガイド
- **[backlog/FEATURE_BACKLOG.md](./features/backlog/FEATURE_BACKLOG.md)** - 機能バックログ
- **[backlog/tickets/](./features/backlog/tickets/)** - 個別チケット管理
- **[designs/](./features/designs/)** - 機能設計ドキュメント

### 🧪 テスト (`testing/`)
- **[CROSS_PLATFORM_TESTING.md](./testing/CROSS_PLATFORM_TESTING.md)** - クロスプラットフォームテスト戦略
- **[PERFORMANCE_TESTING.md](./testing/PERFORMANCE_TESTING.md)** - パフォーマンステストガイド

### ⚙️ 設定 (`configuration/`)
- **[SYSTEM_PROMPT_TEMPLATE.md](./configuration/SYSTEM_PROMPT_TEMPLATE.md)** - システムプロンプトのカスタマイズ

### 🔧 保守 (`maintenance/`)
- **[TECHNICAL_DEBT.md](./maintenance/TECHNICAL_DEBT.md)** - 技術的負債の記録
- **[TECHNICAL_DEBT_RESOLUTION_PLAN.md](./maintenance/TECHNICAL_DEBT_RESOLUTION_PLAN.md)** - 負債解消計画
- **[TECHNICAL_DEBT_TASKS.md](./maintenance/TECHNICAL_DEBT_TASKS.md)** - 具体的なタスク

### 📦 アーカイブ (`archive/`)
過去のドキュメントや完了した移行作業の記録
- **[ARCHITECTURE_V2.md](./archive/ARCHITECTURE_V2.md)** - 旧Clean Architecture設計
- **[fsd-migration/](./archive/fsd-migration/)** - FSD移行関連ドキュメント

---

## 🔍 目的別ナビゲーション

### 「新機能を実装したい」
1. [Feature管理ガイド](./features/README.md)を確認
2. [バックログ](./features/backlog/FEATURE_BACKLOG.md)で既存の計画を確認
3. [FSD開発ガイド](./architecture/FSD_DEVELOPMENT_GUIDE.md)に従って実装

### 「バグを修正したい」
1. [API仕様書](./development/API_SPECIFICATION.md)で正しい動作を確認
2. [実装チェックリスト](./development/IMPLEMENTATION_CHECKLIST.md)で修正時の注意点を確認
3. テストを追加して修正

### 「アーキテクチャを理解したい」
1. [FSDアーキテクチャ](./architecture/FSD_ARCHITECTURE.md)を読む
2. [実装パターン](./architecture/PATTERNS.md)で具体例を確認
3. 実際のコードと照らし合わせる

### 「テストを書きたい」
1. [テスト戦略](./testing/)を確認
2. 既存のテストコードを参考にする
3. TDD（テスト駆動開発）を実践

---

## 📝 ドキュメント管理ルール

### 更新ポリシー
- コードの変更に合わせてドキュメントも更新する
- 大きな変更はPRにドキュメント更新を含める
- 古い情報は削除せず`archive/`に移動

### 命名規則
- 大文字とアンダースコアを使用: `DOCUMENT_NAME.md`
- 機能設計書: `[FEATURE_NAME]_DESIGN.md`
- チケット: `[TICKET-ID]_[feature-name].md`

### 品質基準
- 明確で簡潔な説明
- 実例やコードサンプルを含める
- 関連ドキュメントへのリンクを提供
- 最終更新日を記載