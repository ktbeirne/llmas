// ウィンドウ別Reactアプリケーションのエクスポート
// マルチウィンドウ対応（Phase 3.5.1）

// 設定画面アプリケーション
export { default as SettingsApp } from './SettingsApp';

// チャット画面アプリケーション
export { default as ChatApp } from './ChatApp';

// 将来的に追加予定のアプリケーション:
// export { default as MainApp } from './MainApp';     // メインウィンドウ（Three.js統合）
// export { default as SpeechBubbleApp } from './SpeechBubbleApp'; // スピーチバブル

// ウィンドウタイプ定義
export type WindowType = 'settings' | 'chat' | 'main' | 'speech_bubble';

// アプリケーション選択ヘルパー
export const getAppComponent = (windowType: WindowType) => {
  switch (windowType) {
    case 'settings':
      return SettingsApp;
    case 'chat':
      return ChatApp;
    case 'main':
      // 現在はThree.js実装を維持（ハイブリッドアプローチ）
      return null;
    case 'speech_bubble':
      // 現在は既存実装を維持
      return null;
    default:
      console.warn(`Unknown window type: ${windowType}`);
      return null;
  }
};
