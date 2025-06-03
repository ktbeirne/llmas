/**
 * main.tsx - マルチウィンドウReactエントリーポイント
 *
 * Phase 3.5.1: マルチウィンドウReactアプリケーション対応
 * ウィンドウタイプに応じて適切なReactアプリケーションを起動
 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { getAppComponent, type WindowType } from './apps';

// グローバル型定義の拡張（TypeScript）
declare global {
  interface Window {
    onReactReady?: () => void;
    electronAPI?: any;
    __WINDOW_TYPE__?: WindowType;
  }
}

/**
 * ウィンドウタイプの検出
 * URLパラメータまたはグローバル変数からウィンドウタイプを判定
 */
function detectWindowType(): WindowType {
  // グローバル変数での指定
  if (window.__WINDOW_TYPE__) {
    return window.__WINDOW_TYPE__;
  }

  // URLパラメータでの指定
  const urlParams = new URLSearchParams(window.location.search);
  const windowTypeParam = urlParams.get('windowType') as WindowType;
  if (windowTypeParam) {
    return windowTypeParam;
  }

  // URLパスからの推測
  const pathname = window.location.pathname;
  if (pathname.includes('settings')) {
    return 'settings';
  }
  if (pathname.includes('chat')) {
    return 'chat';
  }
  if (pathname.includes('speech_bubble')) {
    return 'speech_bubble';
  }

  // デフォルトはメインウィンドウ
  return 'main';
}

/**
 * React root要素の検出
 * ウィンドウタイプに応じて適切なroot要素を検索
 */
function findRootElement(windowType: WindowType): HTMLElement {
  // ウィンドウタイプ別のroot要素ID
  const rootIds = {
    settings: ['react-settings-root', 'settings-root', 'root'],
    chat: ['react-chat-root', 'chat-root', 'root'],
    main: ['react-main-root', 'main-root', 'root'],
    speech_bubble: ['react-speech-bubble-root', 'speech-bubble-root', 'root'],
  };

  const candidateIds = rootIds[windowType] || ['root'];

  for (const id of candidateIds) {
    const element = document.getElementById(id);
    if (element) {
      console.log(`📍 [React ${windowType}] Found root element: #${id}`);
      return element;
    }
  }

  throw new Error(`React root element not found for window type: ${windowType}`);
}

/**
 * React アプリケーションの初期化と マウント
 */
async function initializeReactApp() {
  const windowType = detectWindowType();
  console.log(
    `🚀 [React ${windowType}] Initializing React application for window type: ${windowType}`
  );

  try {
    // ウィンドウタイプに対応するアプリコンポーネントを取得
    const AppComponent = getAppComponent(windowType);

    if (!AppComponent) {
      console.log(
        `⚠️ [React ${windowType}] No React component available for window type: ${windowType}`
      );
      console.log(
        `⚠️ [React ${windowType}] Using existing implementation (Three.js/vanilla)`
      );
      return;
    }

    // React root要素の取得
    const rootElement = findRootElement(windowType);

    console.log(`📍 [React ${windowType}] Root element found, creating React root...`);

    // React 18の新しいcreateRoot APIを使用
    const root = createRoot(rootElement);

    // React アプリケーションのマウント
    root.render(
      <StrictMode>
        <AppComponent />
      </StrictMode>
    );

    console.log(`✅ [React ${windowType}] React application mounted successfully`);

    // ElectronAPI availability check
    if (window.electronAPI) {
      console.log(`📡 [React ${windowType}] ElectronAPI detected and available`);
    } else {
      console.warn(
        `⚠️ [React ${windowType}] ElectronAPI not available - running in fallback mode`
      );
    }

    // React準備完了通知
    if (typeof window.onReactReady === 'function') {
      window.onReactReady();
      console.log(`📢 [React ${windowType}] React ready callback executed`);
    }

    // 開発モード時の追加情報
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔧 [React ${windowType}] Development mode active`);
      console.log(`📦 [React ${windowType}] React version:`, React.version);

      // Hot Module Replacement対応
      if (import.meta.hot) {
        console.log(`🔥 [React ${windowType}] Hot Module Replacement enabled`);

        import.meta.hot.accept('./apps', () => {
          console.log(`🔄 [React ${windowType}] Hot reloading app component...`);
          const UpdatedAppComponent = getAppComponent(windowType);
          if (UpdatedAppComponent) {
            root.render(
              <StrictMode>
                <UpdatedAppComponent />
              </StrictMode>
            );
          }
        });
      }
    }
  } catch (error) {
    console.error(`❌ [React ${windowType}] Failed to initialize React app:`, error);

    // エラー情報をより詳細に表示
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    // グローバルエラーハンドラーに通知
    const errorEvent = new ErrorEvent('error', {
      error: error,
      message:
        error instanceof Error
          ? error.message
          : `Unknown React initialization error for ${windowType}`,
    });
    window.dispatchEvent(errorEvent);

    throw error; // エラーを再スロー
  }
}

/**
 * DOM読み込み完了時の初期化
 */
document.addEventListener('DOMContentLoaded', () => {
  const windowType = detectWindowType();
  console.log(
    `📄 [React ${windowType}] DOM content loaded, starting React initialization...`
  );
  initializeReactApp().catch(error => {
    console.error(`💥 [React ${windowType}] Critical initialization error:`, error);
  });
});

// 開発モード時のデバッグ情報
if (process.env.NODE_ENV === 'development') {
  const windowType = detectWindowType();
  console.log(`🏗️ [React ${windowType}] Module loaded in development mode`);
  console.log(`🌐 [React ${windowType}] User Agent:`, navigator.userAgent);
  console.log(`📍 [React ${windowType}] Location:`, window.location.href);
  console.log(`🪟 [React ${windowType}] Detected window type:`, windowType);
}
