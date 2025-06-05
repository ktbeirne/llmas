# React Renderer Architecture

このディレクトリは、LLMDesktopMascotアプリケーションのReactベースのレンダラープロセス実装を含んでいます。

## ディレクトリ構造

### 📁 components/
Reactコンポーネントの集合。UI要素とビジネスロジックを分離し、再利用性を重視。

- **common/**: アプリケーション全体で使用される共通コンポーネント
  - Button, Input, Modal, Loading など
- **settings/**: 設定画面専用のコンポーネント
  - ThemeSelector, WindowSizeControl, VRMModelSelector など
- **chat/**: チャット画面専用のコンポーネント  
  - MessageList, ChatInput, MessageBubble など
- **layout/**: レイアウト関連のコンポーネント
  - Header, Sidebar, MainLayout など

### 📁 contexts/
React Contextによるグローバル状態管理とAPI統合。

- **ElectronContext.tsx**: ElectronAPIとの統合

### 📁 hooks/
カスタムフック（既存の高度な実装あり）。

- **useSettingsSection.ts**: セクション単位のCRUD操作
- **useSettingsLifecycle.ts**: ライフサイクル管理
- **useSettingsForm.ts**: フォーム統合とバリデーション
- **useSettingsPerformance.ts**: パフォーマンス最適化

### 📁 apps/
アプリケーションレベルのコンポーネント。各ウィンドウの最上位コンポーネント。

- **SettingsApp.tsx**: 設定画面のメインアプリケーション
- **ChatApp.tsx**: チャット画面のメインアプリケーション

### 📁 stores/
Zustand による状態管理（既存の実装あり）。

- **settingsStore.ts**: 設定状態の管理
- **settingsValidation.ts**: バリデーション機能
- **performanceIntegration.ts**: パフォーマンス統合

### 📁 types/
TypeScript型定義。

### 📁 utils/
ユーティリティ関数。

## マルチウィンドウ対応

各ウィンドウは独立したReactアプリケーションとして動作：

1. **Settings Window**: settings.html → SettingsApp.tsx
2. **Chat Window**: chat.html → ChatApp.tsx  
3. **Main Window**: 既存のThree.js実装を維持（ハイブリッドアプローチ）

## 技術スタック

- **React 19.1.0**: 最新のReact機能
- **TypeScript**: 型安全性
- **Zustand**: 軽量な状態管理
- **React Hook Form**: フォーム管理
- **Vite**: 高速ビルド
- **Electron**: デスクトップアプリ統合

## 開発方針

1. **コンポーネント駆動開発**: 小さく再利用可能なコンポーネント
2. **型安全性**: TypeScriptによる厳密な型チェック
3. **テスト駆動開発**: 各コンポーネントとフックのテスト
4. **パフォーマンス重視**: メモ化、遅延読み込み、最適化
5. **アクセシビリティ**: WCAG準拠のUI実装