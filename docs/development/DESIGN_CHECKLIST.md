# 設計チェックリスト

**目的**: 保守性の高いアーキテクチャ設計のための確認事項  
**対象フェーズ**: 設計・計画段階  
**📅 参照時期**: 設計開始時、設計レビュー時、アーキテクチャ判断時

---

## 🏗️ アーキテクチャ設計

### FSD層構造遵守
- [ ] **適切な層配置**: Feature/Widget/Shared/Entitiesの適切な層に配置されているか？
- [ ] **依存方向**: 上位層から下位層への依存のみか？
- [ ] **Feature独立性**: Feature間の直接依存がないか？
- [ ] **Public API設計**: index.tsでの公開APIが明確に設計されているか？

### 依存関係設計
- [ ] **シングルトン回避**: グローバルインスタンスを使用していないか？
- [ ] **グローバル変数禁止**: 状態をグローバルスコープに置いていないか？
- [ ] **依存注入**: 外部依存は引数で受け取る設計か？
- [ ] **循環依存回避**: A→B→Aの依存関係がないか？
- [ ] **Interface分離**: 必要な機能のみを依存する設計か？

### 状態管理設計
- [ ] **状態最小化**: 必要最小限の状態のみか？
- [ ] **正規化**: 重複データがないか？
- [ ] **責任範囲**: 状態の所有者が明確か？
- [ ] **Event-driven**: Feature間の状態共有にEvent busを使用するか？
- [ ] **不変性**: 状態の変更が予測可能か？

---

## 🔧 技術固有設計

### Electronマルチプロセス考慮
- [ ] **プロセス境界**: Main/Renderer間の責任分離は適切か？
- [ ] **IPC効率性**: 必要最小限の通信か？
- [ ] **メモリ共有回避**: プロセス間で危険な共有をしていないか？
- [ ] **セキュリティ**: nodeIntegration等のセキュリティを考慮しているか？

### Three.js/VRM最適化
- [ ] **リソース管理**: テクスチャ・ジオメトリの適切な破棄は設計されているか？
- [ ] **フレームレート**: 60fps維持可能な設計か？
- [ ] **メモリ制限**: VRMモデルサイズを考慮しているか？
- [ ] **WebGLコンテキスト**: コンテキストロスト対応は設計されているか？

### 非同期処理設計
- [ ] **Race condition回避**: 競合状態を考慮しているか？
- [ ] **キャンセレーション**: 長時間処理の中断手段があるか？
- [ ] **エラー境界**: 非同期エラーの伝播を制御しているか？
- [ ] **リソース保証**: 適切なクリーンアップ設計があるか？

---

## 🛡️ 品質・保守性設計

### エラーハンドリング設計
- [ ] **早期失敗**: 問題を早期に発見・報告する設計か？
- [ ] **具体的エラー**: 「何が」「なぜ」失敗したか分かる設計か？
- [ ] **回復可能性**: 可能な場合は代替手段があるか？
- [ ] **ログ設計**: デバッグに必要な情報を記録する設計か？

### テスタビリティ設計
- [ ] **単体テスト**: 各コンポーネントが独立してテスト可能か？
- [ ] **モック境界**: テスト用の境界が明確か？
- [ ] **決定論的**: 同じ入力で同じ出力が保証されるか？
- [ ] **副作用分離**: 副作用を局所化しているか？

### パフォーマンス設計
- [ ] **ボトルネック特定**: 性能問題の可能性は？
- [ ] **拡張性**: 将来の負荷増に対応できるか？
- [ ] **キャッシュ戦略**: 適切なキャッシュ設計があるか？
- [ ] **レンダリング最適化**: 不要な再描画を避ける設計か？

---

## 🎯 静的解析設計

### ESLint/TypeScript考慮
- [ ] **ESLint設定**: プロジェクトのESLint設定を理解しているか？
- [ ] **TypeScript設定**: strict modeを考慮した設計か？
- [ ] **カスタムルール**: FSD専用ルール（import制限等）を考慮しているか？
- [ ] **型安全性**: any型を使わない設計になっているか？

---

## ✅ 設計完了基準

以下がすべて満たされた場合、設計フェーズを完了とする：

- [ ] すべてのチェック項目をクリア
- [ ] 設計ドキュメントの作成
- [ ] チームレビューの完了
- [ ] 実装方針の明確化
- [ ] テスト戦略の策定

---

**📝 Note**: 設計変更が必要な場合は、影響範囲を評価し、このチェックリストを再確認してください。