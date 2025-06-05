# FSD ベストプラクティス

## 🎯 重要原則

### 1. 独立性の維持
- 各Featureは独立して開発・テスト可能であること
- Feature間の直接依存を避ける

### 2. Public APIの明確化
- index.tsで公開するものを明示的に定義
- 内部実装の詳細を隠蔽

### 3. イベント駆動の活用
- Feature間通信はイベントバスを使用
- 疎結合を維持

### 4. TDDの実践
- RED → GREEN → REFACTOR
- テストがドキュメントとしての役割を果たす

## ✅ 推奨事項

1. **小さなFeatureを保つ**
   - 1つのFeatureは1つの明確な責務
   - 大きくなりすぎたら分割を検討

2. **命名の一貫性**
   - Feature名: kebab-case
   - ファイル名: 役割に応じた命名規則

3. **エラーハンドリング**
   - Feature内でキャッチしたエラーはイベントで通知
   - グローバルエラーハンドラーで一元管理

4. **パフォーマンス考慮**
   - 不要なレンダリングを避ける
   - イベントリスナーの適切なクリーンアップ

## ❌ アンチパターン

1. **Feature間の直接import**
```typescript
// ❌ Bad
import { someInternalFunction } from '../other-feature/lib/utils';

// ✅ Good
import { publicAPI } from '@features/other-feature';
```

2. **巨大なStore**
```typescript
// ❌ Bad: 100以上のプロパティを持つStore

// ✅ Good: 責務ごとに分割
```

3. **同期的な処理の乱用**
```typescript
// ❌ Bad: 他Featureの状態を直接待つ

// ✅ Good: イベントベースの非同期処理
```