/**
 * ElectronContext.tsx - ElectronAPI統合のReact Context
 *
 * Phase 3.5.1 Task 4: 既存IPCのReact Context統合
 * 型安全なElectronAPI アクセスとリアルタイム通知管理
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';

import type { ElectronAPI } from '../../preload.types';

// Context型定義
interface ElectronContextType {
  // ElectronAPI アクセス
  api: ElectronAPI | null;
  isElectronAvailable: boolean;

  // 接続状態
  connectionStatus: 'checking' | 'connected' | 'disconnected';
  lastError: Error | null;

  // アプリケーション情報
  appInfo: {
    version?: string;
    platform?: string;
    arch?: string;
  };

  // リアルタイム状態
  chatWindowVisible: boolean;
  settingsWindowOpen: boolean;
  currentTheme: string;
  speechBubbleText: string;

  // ヘルパーメソッド
  invoke: <T = any>(method: keyof ElectronAPI, ...args: any[]) => Promise<T>;
  safeInvoke: <T = any>(
    method: keyof ElectronAPI,
    ...args: any[]
  ) => Promise<{ success: boolean; data?: T; error?: string }>;
  clearError: () => void;
}

// Context作成
const ElectronContext = createContext<ElectronContextType | null>(null);

// Provider Props
interface ElectronProviderProps {
  children: React.ReactNode;
}

/**
 * ElectronProvider - ElectronAPI統合プロバイダー
 */
export const ElectronProvider: React.FC<ElectronProviderProps> = ({ children }) => {
  // 基本状態
  const [connectionStatus, setConnectionStatus] = useState<
    'checking' | 'connected' | 'disconnected'
  >('checking');
  const [lastError, setLastError] = useState<Error | null>(null);
  const [appInfo, setAppInfo] = useState<{
    version?: string;
    platform?: string;
    arch?: string;
  }>({});

  // リアルタイム状態
  const [chatWindowVisible, setChatWindowVisible] = useState(false);
  const [settingsWindowOpen, setSettingsWindowOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState('default');
  const [speechBubbleText, setSpeechBubbleText] = useState('');

  // ElectronAPI の可用性確認
  const api = useMemo(() => {
    if (typeof window !== 'undefined' && window.electronAPI) {
      return window.electronAPI;
    }
    return null;
  }, []);

  const isElectronAvailable = useMemo(() => {
    return api !== null;
  }, [api]);

  // 安全なAPI呼び出しヘルパー
  const invoke = useCallback(
    async <T = any,>(method: keyof ElectronAPI, ...args: any[]): Promise<T> => {
      if (!api || typeof api[method] !== 'function') {
        throw new Error(`ElectronAPI method '${String(method)}' is not available`);
      }

      try {
        // @ts-ignore - 型チェック回避（実行時に確認済み）
        const result = await api[method](...args);
        return result;
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error(String(error));
        setLastError(errorObj);
        throw errorObj;
      }
    },
    [api]
  );

  // エラーハンドリング付きAPI呼び出し
  const safeInvoke = useCallback(
    async <T = any,>(
      method: keyof ElectronAPI,
      ...args: any[]
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      try {
        const data = await invoke<T>(method, ...args);
        return { success: true, data };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(
          `[ElectronContext] Safe invoke failed for ${String(method)}:`,
          errorMessage
        );
        return { success: false, error: errorMessage };
      }
    },
    [invoke]
  );

  // エラークリア
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  // 初期化処理
  useEffect(() => {
    const initializeElectronContext = async () => {
      if (!api) {
        console.warn('[ElectronContext] ElectronAPI not available');
        setConnectionStatus('disconnected');
        return;
      }

      try {
        console.log('[ElectronContext] Initializing Electron context...');

        // アプリケーション情報の取得（存在する場合）
        if (typeof api.getAppInfo === 'function') {
          try {
            const info = await api.getAppInfo();
            setAppInfo(info || {});
          } catch (error) {
            console.warn('[ElectronContext] Failed to get app info:', error);
          }
        }

        // 初期状態の取得
        const initialState = await Promise.allSettled([
          // チャットウィンドウの可視性
          api.getChatWindowVisible?.() || Promise.resolve(false),
          // 現在のテーマ
          api.getTheme?.() || Promise.resolve('default'),
        ]);

        // 結果の処理
        if (initialState[0].status === 'fulfilled') {
          setChatWindowVisible(initialState[0].value);
        }
        if (initialState[1].status === 'fulfilled') {
          setCurrentTheme(initialState[1].value);
        }

        setConnectionStatus('connected');
        console.log('[ElectronContext] Electron context initialized successfully');
      } catch (error) {
        console.error('[ElectronContext] Initialization failed:', error);
        setLastError(error instanceof Error ? error : new Error(String(error)));
        setConnectionStatus('disconnected');
      }
    };

    initializeElectronContext();
  }, [api]);

  // リアルタイム通知のセットアップ
  useEffect(() => {
    if (!api) return;

    const cleanupFunctions: (() => void)[] = [];

    try {
      // チャットウィンドウ状態変更の監視
      if (typeof api.onChatWindowStateChanged === 'function') {
        api.onChatWindowStateChanged(isVisible => {
          console.log('[ElectronContext] Chat window state changed:', isVisible);
          setChatWindowVisible(isVisible);
        });
      }

      // 設定ウィンドウ状態変更の監視
      if (typeof api.onSettingsWindowStateChanged === 'function') {
        api.onSettingsWindowStateChanged(isOpen => {
          console.log('[ElectronContext] Settings window state changed:', isOpen);
          setSettingsWindowOpen(isOpen);
        });
      }

      // テーマ変更の監視
      if (typeof api.onThemeChanged === 'function') {
        api.onThemeChanged(theme => {
          console.log('[ElectronContext] Theme changed:', theme);
          setCurrentTheme(theme);
        });
      }

      // スピーチバブルテキスト変更の監視
      if (typeof api.onSetSpeechBubbleText === 'function') {
        api.onSetSpeechBubbleText(text => {
          console.log('[ElectronContext] Speech bubble text changed:', text);
          setSpeechBubbleText(text);
        });
      }
    } catch (error) {
      console.error('[ElectronContext] Failed to setup real-time listeners:', error);
      setLastError(error instanceof Error ? error : new Error(String(error)));
    }

    // クリーンアップ
    return () => {
      cleanupFunctions.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('[ElectronContext] Cleanup function failed:', error);
        }
      });
    };
  }, [api]);

  // コンテキスト値
  const contextValue: ElectronContextType = useMemo(
    () => ({
      api,
      isElectronAvailable,
      connectionStatus,
      lastError,
      appInfo,
      chatWindowVisible,
      settingsWindowOpen,
      currentTheme,
      speechBubbleText,
      invoke,
      safeInvoke,
      clearError,
    }),
    [
      api,
      isElectronAvailable,
      connectionStatus,
      lastError,
      appInfo,
      chatWindowVisible,
      settingsWindowOpen,
      currentTheme,
      speechBubbleText,
      invoke,
      safeInvoke,
      clearError,
    ]
  );

  return (
    <ElectronContext.Provider value={contextValue}>{children}</ElectronContext.Provider>
  );
};

/**
 * useElectron - ElectronContextへのアクセスHook
 */
export const useElectron = (): ElectronContextType => {
  const context = useContext(ElectronContext);
  if (!context) {
    throw new Error('useElectron must be used within an ElectronProvider');
  }
  return context;
};

/**
 * useElectronAPI - ElectronAPIの直接アクセスHook
 */
export const useElectronAPI = () => {
  const { api, isElectronAvailable, connectionStatus } = useElectron();
  return { api, isElectronAvailable, connectionStatus };
};

/**
 * useElectronMethod - 特定のElectronAPIメソッドを簡単に使用するHook
 */
export const useElectronMethod = <T = any,>(method: keyof ElectronAPI) => {
  const { invoke, safeInvoke, isElectronAvailable } = useElectron();

  const call = useCallback(
    (...args: any[]): Promise<T> => {
      return invoke<T>(method, ...args);
    },
    [invoke, method]
  );

  const safeCall = useCallback(
    (...args: any[]) => {
      return safeInvoke<T>(method, ...args);
    },
    [safeInvoke, method]
  );

  return {
    call,
    safeCall,
    isAvailable: isElectronAvailable,
  };
};

/**
 * useElectronState - リアルタイム状態へのアクセスHook
 */
export const useElectronState = () => {
  const {
    chatWindowVisible,
    settingsWindowOpen,
    currentTheme,
    speechBubbleText,
    connectionStatus,
    lastError,
  } = useElectron();

  return {
    chatWindowVisible,
    settingsWindowOpen,
    currentTheme,
    speechBubbleText,
    connectionStatus,
    lastError,
  };
};

// 型定義のエクスポート
export type { ElectronContextType };
