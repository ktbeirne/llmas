# Lintエラー段階的解消計画

## Phase 0: ESLint設定の修正（即座に実施）

### 1. ESLint設定ファイルの修正
```javascript
// eslint.config.jsに追加すべき内容:
// 1. ignoresにテストファイルパスを追加
ignores: [
  'tests/e2e/**',        // Playwrightテストを除外
  'tests/e2e-old/**',    // 旧E2Eテストを除外
  'playwright-*.config.ts' // Playwright設定を除外
]

// 2. テストファイル用の設定を追加
{
  files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', '**/*.spec.tsx'],
  languageOptions: {
    parser: tsparser,
    parserOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      project: './tsconfig.json'
    }
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    'vitest/expect-expect': 'off',
    'vitest/no-test-return-statement': 'off'
  }
}
```

### 2. Vitestプラグインの追加
```bash
npm install --save-dev eslint-plugin-vitest
```

## Phase 1: 自動修正可能なエラーの一括修正（1時間）

### 実行コマンド
```bash
# 1. 基本的な自動修正
npm run lint -- --fix

# 2. 特定のルールに絞った修正
# nullish coalescing
npx eslint . --fix --rule '@typescript-eslint/prefer-nullish-coalescing: error'

# import order
npx eslint . --fix --rule 'import/order: error'
```

### 予想される修正数
- import/order: 約150ファイル
- prefer-nullish-coalescing: 約100箇所
- その他の自動修正: 約50箇所

## Phase 2: Parsing Errorの解消（2-3時間）

### 対象ファイル
1. **E2Eテストファイル** (tests/e2e/**)
   - ESLint設定で除外するか、TypeScript構文を修正
   
2. **統合テストファイル** (tests/integration/**)
   - TypeScript構文の修正
   
3. **Providerファイル** (src/app/providers/**)
   - ジェネリック型構文の修正

### 修正方法
- 型アノテーションの修正
- ジェネリック型の構文修正
- インターフェース宣言の修正

## Phase 3: React Hooks違反の修正（2時間）

### 主な違反パターン
```typescript
// ❌ 違反例
export default () => {
  const hook = useHook(); // 関数名が大文字で始まっていない
}

// ✅ 修正例
export default function ComponentName() {
  const hook = useHook();
}
```

### 対象ファイル
- src/app/providers/LazyWidgets.tsx
- その他のReactコンポーネントファイル

## Phase 4: TypeScript型定義の改善（4-6時間）

### 優先順位
1. **明示的なany型の削除**（高）
   - 適切な型定義への置換
   - unknown型への置換（必要に応じて）

2. **未使用変数の削除**（中）
   - アンダースコアプレフィックスの追加
   - 実際に不要な変数の削除

3. **Promiseの適切な処理**（高）
   - await追加
   - void演算子での明示的な無視
   - .catch()ハンドラの追加

## Phase 5: 継続的な品質維持（継続的）

### CI/CDへの統合
```yaml
# GitHub Actionsでの自動チェック
- name: Lint Check
  run: npm run lint
  
- name: Type Check
  run: npm run typecheck
```

### Pre-commitフックの設定
```json
// package.jsonに追加
"husky": {
  "hooks": {
    "pre-commit": "npm run lint"
  }
}
```

## 実施スケジュール

| Phase | 内容 | 推定時間 | 優先度 |
|-------|------|----------|--------|
| 0 | ESLint設定修正 | 30分 | 最高 |
| 1 | 自動修正 | 1時間 | 高 |
| 2 | Parsing Error解消 | 2-3時間 | 高 |
| 3 | React Hooks修正 | 2時間 | 中 |
| 4 | TypeScript型改善 | 4-6時間 | 中 |
| 5 | 継続的品質維持 | 継続的 | 低 |

## 成功指標
- エラー数: 859 → 0
- ワーニング数: 359 → 100以下
- 自動修正率: 80%以上
- CI/CDでのlintチェック通過率: 100%