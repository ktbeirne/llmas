/**
 * useSettingsLifecycle.ts - 設定コンポーネントライフサイクル管理Hook
 *
 * Phase 3.2.2 Task 2: BaseSettingsComponentのライフサイクル機能をReact Hook化
 * リソース管理、クリーンアップ、エラーハンドリング、イベント管理を提供
 */

import { useCallback, useEffect, useRef, useState, useMemo } from 'react';

import { useSettingsStore } from '../stores/settingsStore';
import type { SettingsSection } from '../stores/settingsStore';

/**
 * ライフサイクル状態型定義
 */
export interface LifecycleState {
  isInitialized: boolean;
  isDisposed: boolean;
  hasError: boolean;
  lastError?: Error;
  mountTime: number;
  initializationTime?: number;
}

/**
 * リソース管理型定義
 */
export interface ResourceManager {
  timers: Set<number>;
  intervals: Set<number>;
  eventListeners: Map<string, () => void>;
  disposableResources: Set<() => void>;
}

/**
 * エラーコンテキスト型定義
 */
export interface ErrorContext {
  component: string;
  operation: string;
  section?: SettingsSection;
  timestamp: number;
  userAgent: string;
  url: string;
}

/**
 * useSettingsLifecycle戻り値型定義
 */
export interface UseSettingsLifecycleReturn {
  // ライフサイクル状態
  lifecycleState: LifecycleState;

  // 初期化・クリーンアップ
  initialize: (componentName: string, sections?: SettingsSection[]) => Promise<void>;
  dispose: () => void;
  reset: () => Promise<void>;

  // リソース管理
  registerTimer: (timer: number) => void;
  registerInterval: (interval: number) => void;
  addEventListenerWithCleanup: (
    element: EventTarget,
    event: string,
    handler: EventListener
  ) => void;
  registerDisposable: (cleanup: () => void) => void;

  // エラーハンドリング
  handleError: (error: Error, context: Partial<ErrorContext>) => void;
  clearError: () => void;

  // 便利な状態
  isReady: boolean;
  uptime: number;
}

/**
 * 設定コンポーネントライフサイクル管理Hook
 *
 * @param componentName - コンポーネント識別名
 * @returns ライフサイクル管理機能
 */
export function useSettingsLifecycle(
  componentName: string = 'SettingsComponent'
): UseSettingsLifecycleReturn {
  // 内部状態管理
  const [lifecycleState, setLifecycleState] = useState<LifecycleState>(() => ({
    isInitialized: false,
    isDisposed: false,
    hasError: false,
    mountTime: Date.now(),
  }));

  // Zustand Store接続
  const store = useSettingsStore();

  // リソース管理
  const resourcesRef = useRef<ResourceManager>({
    timers: new Set(),
    intervals: new Set(),
    eventListeners: new Map(),
    disposableResources: new Set(),
  });

  // 初期化状態追跡
  const isInitializingRef = useRef<boolean>(false);
  const componentNameRef = useRef<string>(componentName);

  // 初期化メソッド
  const initialize = useCallback(
    async (compName: string, sections?: SettingsSection[]): Promise<void> => {
      // 重複初期化防止（現在の状態を直接確認）
      if (isInitializingRef.current) {
        console.warn(`[useSettingsLifecycle] ${compName} is currently initializing`);
        return;
      }

      isInitializingRef.current = true;
      componentNameRef.current = compName;

      try {
        console.log(`[useSettingsLifecycle] Initializing ${compName}...`);

        const initStartTime = Date.now();

        // エラー状態をクリア
        setLifecycleState(prev => ({
          ...prev,
          hasError: false,
          lastError: undefined,
        }));

        // 指定されたセクションを初期化
        if (sections && sections.length > 0) {
          console.log(`[useSettingsLifecycle] Initializing sections: ${sections.join(', ')}`);

          // セクション並行初期化
          await Promise.all(
            sections.map(async section => {
              try {
                await store.initializeSection(section);
                console.log(`[useSettingsLifecycle] Section ${section} initialized`);
              } catch (error) {
                console.error(
                  `[useSettingsLifecycle] Failed to initialize section ${section}:`,
                  error
                );
                throw error;
              }
            })
          );
        } else {
          // 全セクション初期化
          console.log(`[useSettingsLifecycle] Initializing all sections...`);
          await store.initializeAllSections();
        }

        const initEndTime = Date.now();

        setLifecycleState(prev => ({
          ...prev,
          isInitialized: true,
          initializationTime: initEndTime - initStartTime,
        }));

        console.log(
          `[useSettingsLifecycle] ${compName} initialized successfully in ${initEndTime - initStartTime}ms`
        );
      } catch (error) {
        const lifecycleError = error as Error;
        console.error(`[useSettingsLifecycle] Failed to initialize ${compName}:`, lifecycleError);

        setLifecycleState(prev => ({
          ...prev,
          hasError: true,
          lastError: lifecycleError,
        }));

        throw lifecycleError;
      } finally {
        isInitializingRef.current = false;
      }
    },
    [store]
  ); // lifecycleState.isInitializedを依存配列から除去

  // クリーンアップメソッド
  const dispose = useCallback((): void => {
    if (lifecycleState.isDisposed) {
      console.warn(`[useSettingsLifecycle] ${componentNameRef.current} is already disposed`);
      return;
    }

    console.log(`[useSettingsLifecycle] Disposing ${componentNameRef.current}...`);

    const resources = resourcesRef.current;

    try {
      // タイマーのクリーンアップ
      resources.timers.forEach(timer => {
        clearTimeout(timer);
      });
      resources.timers.clear();

      // インターバルのクリーンアップ
      resources.intervals.forEach(interval => {
        clearInterval(interval);
      });
      resources.intervals.clear();

      // イベントリスナーのクリーンアップ
      resources.eventListeners.forEach((cleanup, eventKey) => {
        try {
          cleanup();
        } catch (error) {
          console.warn(
            `[useSettingsLifecycle] Failed to cleanup event listener ${eventKey}:`,
            error
          );
        }
      });
      resources.eventListeners.clear();

      // カスタムリソースのクリーンアップ
      resources.disposableResources.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn(`[useSettingsLifecycle] Failed to cleanup disposable resource:`, error);
        }
      });
      resources.disposableResources.clear();

      // ストアリセット（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        store.dispose();
      }

      setLifecycleState(prev => ({
        ...prev,
        isDisposed: true,
        isInitialized: false,
      }));

      console.log(`[useSettingsLifecycle] ${componentNameRef.current} disposed successfully`);
    } catch (error) {
      console.error(`[useSettingsLifecycle] Error during disposal:`, error);
    }
  }, [store, lifecycleState.isDisposed]);

  // リセットメソッド
  const reset = useCallback(async (): Promise<void> => {
    console.log(`[useSettingsLifecycle] Resetting ${componentNameRef.current}...`);

    // 先にクリーンアップ
    dispose();

    // 短い遅延後に再初期化
    await new Promise(resolve => setTimeout(resolve, 100));

    setLifecycleState(prev => ({
      isInitialized: false,
      isDisposed: false,
      hasError: false,
      lastError: undefined,
      mountTime: Date.now(),
      initializationTime: prev.initializationTime,
    }));

    // 再初期化
    await initialize(componentNameRef.current);

    console.log(`[useSettingsLifecycle] ${componentNameRef.current} reset completed`);
  }, [dispose, initialize]);

  // リソース管理メソッド
  const registerTimer = useCallback((timer: number): void => {
    resourcesRef.current.timers.add(timer);
  }, []);

  const registerInterval = useCallback((interval: number): void => {
    resourcesRef.current.intervals.add(interval);
  }, []);

  const addEventListenerWithCleanup = useCallback(
    (element: EventTarget, event: string, handler: EventListener): void => {
      const eventKey = `${element.constructor.name}_${event}_${Date.now()}`;

      element.addEventListener(event, handler);

      const cleanup = () => {
        element.removeEventListener(event, handler);
      };

      resourcesRef.current.eventListeners.set(eventKey, cleanup);

      console.log(`[useSettingsLifecycle] Event listener registered: ${eventKey}`);
    },
    []
  );

  const registerDisposable = useCallback((cleanup: () => void): void => {
    resourcesRef.current.disposableResources.add(cleanup);
  }, []);

  // エラーハンドリング
  const handleError = useCallback(
    (error: Error, context: Partial<ErrorContext> = {}): void => {
      const errorContext: ErrorContext = {
        component: componentNameRef.current,
        operation: context.operation || 'unknown',
        section: context.section,
        timestamp: Date.now(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        ...context,
      };

      console.error(`[useSettingsLifecycle] Error in ${errorContext.component}:`, {
        error,
        context: errorContext,
      });

      // ストアエラーハンドリングと連携
      if (errorContext.section) {
        store.handleError(errorContext.section, error, errorContext.operation);
      }

      setLifecycleState(prev => ({
        ...prev,
        hasError: true,
        lastError: error,
      }));
    },
    [store]
  );

  const clearError = useCallback((): void => {
    setLifecycleState(prev => ({
      ...prev,
      hasError: false,
      lastError: undefined,
    }));
  }, []);

  // 計算プロパティ
  const isReady = useMemo(() => {
    return (
      lifecycleState.isInitialized &&
      !lifecycleState.isDisposed &&
      !lifecycleState.hasError &&
      !isInitializingRef.current
    );
  }, [lifecycleState.isInitialized, lifecycleState.isDisposed, lifecycleState.hasError]);

  const uptime = useMemo(() => {
    return Date.now() - lifecycleState.mountTime;
  }, [lifecycleState.mountTime]);

  // アンマウント時の自動クリーンアップ
  useEffect(() => {
    return () => {
      console.log(`[useSettingsLifecycle] Component unmounting, cleaning up...`);
      dispose();
    };
  }, [dispose]);

  // Error Boundary連携（グローバルエラーハンドリング）
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      handleError(event.error || new Error(event.message), {
        operation: 'globalError',
        component: componentNameRef.current,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));
      handleError(error, {
        operation: 'unhandledRejection',
        component: componentNameRef.current,
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('error', handleGlobalError);
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      return () => {
        window.removeEventListener('error', handleGlobalError);
        window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      };
    }
  }, [handleError]);

  // 戻り値オブジェクト（メモ化）
  return useMemo(
    () => ({
      // ライフサイクル状態
      lifecycleState,

      // 初期化・クリーンアップ
      initialize,
      dispose,
      reset,

      // リソース管理
      registerTimer,
      registerInterval,
      addEventListenerWithCleanup,
      registerDisposable,

      // エラーハンドリング
      handleError,
      clearError,

      // 便利な状態
      isReady,
      uptime,
    }),
    [
      lifecycleState,
      initialize,
      dispose,
      reset,
      registerTimer,
      registerInterval,
      addEventListenerWithCleanup,
      registerDisposable,
      handleError,
      clearError,
      isReady,
      uptime,
    ]
  );
}

/**
 * 設定コンポーネント統合ライフサイクルHook
 * useSettingsSectionと組み合わせて使用
 */
export interface UseIntegratedSettingsLifecycleOptions {
  componentName: string;
  autoInitialize?: boolean;
  sections?: SettingsSection[];
  errorBoundary?: boolean;
}

export function useIntegratedSettingsLifecycle(
  options: UseIntegratedSettingsLifecycleOptions
): UseSettingsLifecycleReturn {
  const { componentName, autoInitialize = true, sections, errorBoundary = true } = options;

  const lifecycle = useSettingsLifecycle(componentName);

  // 自動初期化
  useEffect(() => {
    if (autoInitialize && !lifecycle.lifecycleState.isInitialized) {
      console.log(`[useIntegratedSettingsLifecycle] Auto-initializing ${componentName}...`);

      lifecycle.initialize(componentName, sections).catch(error => {
        console.error(`[useIntegratedSettingsLifecycle] Auto-initialization failed:`, error);

        if (errorBoundary) {
          lifecycle.handleError(error, {
            operation: 'autoInitialize',
            component: componentName,
          });
        }
      });
    }
  }, [lifecycle, componentName, sections, autoInitialize, errorBoundary]);

  return lifecycle;
}

export default useSettingsLifecycle;
