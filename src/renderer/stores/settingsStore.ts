/**
 * settingsStore.ts - React版設定状態管理（Zustand）
 *
 * Phase 3.2.1: BaseSettingsComponentの状態管理機能をZustandで再現
 * 統一されたライフサイクル、エラーハンドリング、パフォーマンス管理を提供
 */

import { create } from 'zustand';
import { devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// ImmerのMapSetサポートを有効化
enableMapSet();

// 型インポート
import type {
  SettingsData,
  WindowSizeSettings,
  CameraSettings,
  WindowBounds,
} from '../../utils/settingsStore';
import type { ExpressionSettings, VRMExpressionInfo } from '../../types/tools';
import type { ValidationError } from '../../settings/interfaces/SettingsInterfaces';

import {
  validateWindowSettings,
  validateChatSettings,
  validateThemeSettings,
  validateExpressionSettings,
} from './settingsValidation';

// パフォーマンス・エラーハンドリング統合
import {
  settingsPerformanceIntegrator,
  ReactErrorHandler,
  SettingsPerformanceIntegrator,
} from './performanceIntegration';

/**
 * 設定セクション定義
 */
export type SettingsSection = 'window' | 'chat' | 'theme' | 'expressions';

/**
 * 各セクションの設定データ型マッピング
 */
export interface SettingsDataMap {
  window: WindowSettingsData;
  chat: ChatSettingsData;
  theme: ThemeSettingsData;
  expressions: ExpressionSettingsData;
}

/**
 * Window設定データ
 */
export interface WindowSettingsData {
  windowSize: WindowSizeSettings;
  vrmModelPath: string;
  cameraSettings: CameraSettings;
  mainWindowBounds?: WindowBounds;
}

/**
 * Chat設定データ
 */
export interface ChatSettingsData {
  userName: string;
  mascotName: string;
  systemPromptCore: string;
  chatWindowBounds?: WindowBounds;
  chatWindowVisible: boolean;
}

/**
 * Theme設定データ
 */
export interface ThemeSettingsData {
  currentTheme: string;
  availableThemes: ThemeInfo[];
}

/**
 * Expression設定データ
 */
export interface ExpressionSettingsData {
  settings: ExpressionSettings;
  availableExpressions: VRMExpressionInfo[];
  defaultExpression: string;
}

/**
 * テーマ情報
 */
export interface ThemeInfo {
  id: string;
  name: string;
  description?: string;
  preview?: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}

/**
 * 操作結果型
 */
export interface OperationResult {
  success: boolean;
  error?: string;
  data?: any;
}

/**
 * パフォーマンス管理型
 */
export interface PerformanceState {
  operations: Map<string, number>;
  memoryUsage?: MemoryInfo;
  lastUpdateTime: number;
}

/**
 * エラー状態管理型
 */
export interface ErrorState {
  hasError: boolean;
  lastError?: Error;
  errorHistory: Array<{
    error: Error;
    timestamp: number;
    operation: string;
    section: SettingsSection;
  }>;
}

/**
 * メインSettings Store状態型
 */
export interface SettingsStoreState {
  // 各設定セクションの状態
  window: WindowSettingsData | null;
  chat: ChatSettingsData | null;
  theme: ThemeSettingsData | null;
  expressions: ExpressionSettingsData | null;

  // 共通状態管理
  isLoading: Record<SettingsSection, boolean>;
  errors: Record<SettingsSection, Error | null>;
  validation: Record<SettingsSection, ValidationError[]>;

  // パフォーマンス管理
  performance: PerformanceState;

  // エラー管理
  errorState: ErrorState;

  // 初期化状態
  isInitialized: Record<SettingsSection, boolean>;
  isDisposed: boolean;
}

/**
 * Settings Store アクション型
 */
export interface SettingsStoreActions {
  // 基本CRUD操作
  loadSettings: <T extends SettingsSection>(section: T) => Promise<void>;
  updateSettings: <T extends SettingsSection>(
    section: T,
    data: SettingsDataMap[T]
  ) => Promise<void>;
  resetSettings: <T extends SettingsSection>(section: T) => Promise<void>;

  // 初期化・クリーンアップ
  initializeSection: <T extends SettingsSection>(section: T) => Promise<void>;
  initializeAllSections: () => Promise<void>;
  dispose: () => void;

  // バリデーション
  validateSettings: <T extends SettingsSection>(
    section: T,
    data: SettingsDataMap[T]
  ) => ValidationError[];
  clearValidationErrors: (section: SettingsSection) => void;

  // パフォーマンス管理（統合型）
  startOperation: (name: string, section?: SettingsSection) => string;
  endOperation: (name: string, section?: SettingsSection) => number;
  getPerformanceMetrics: () => PerformanceState & { comprehensive?: any };
  getComprehensivePerformanceReport: () => string;
  resetIntegratedMetrics: () => void;
  trackComponentRender: (componentName: string, renderTime: number) => void;

  // エラー管理（統合型）
  handleError: (section: SettingsSection, error: Error, operation: string) => void;
  clearErrors: (section?: SettingsSection) => void;
  getErrorHistory: () => ErrorState['errorHistory'];

  // デバッグ・開発支援
  getDebugInfo: () => {
    state: SettingsStoreState;
    performance: PerformanceState;
    errors: ErrorState;
  };
}

/**
 * 完全なSettings Store型
 */
export type SettingsStore = SettingsStoreState & SettingsStoreActions;

/**
 * デフォルト設定値
 */
const DEFAULT_SETTINGS = {
  window: {
    windowSize: { width: 400, height: 800, preset: 'medium' },
    vrmModelPath: '/avatar.vrm',
    cameraSettings: {
      position: { x: 0.0, y: 1.2, z: 5.0 },
      target: { x: 0.0, y: 1.0, z: 0.0 },
      zoom: 1.0,
    },
  } as WindowSettingsData,

  chat: {
    userName: 'User',
    mascotName: 'Mascot',
    systemPromptCore:
      'あなたは親しみやすいデスクトップマスコットです。ユーザーとの会話を楽しみ、役立つ情報を提供してください。',
    chatWindowVisible: false,
  } as ChatSettingsData,

  theme: {
    currentTheme: 'default',
    availableThemes: [],
  } as ThemeSettingsData,

  expressions: {
    settings: {
      happy: { enabled: true, defaultWeight: 1.0 },
      sad: { enabled: true, defaultWeight: 1.0 },
      angry: { enabled: true, defaultWeight: 1.0 },
      surprised: { enabled: true, defaultWeight: 1.0 },
      neutral: { enabled: true, defaultWeight: 1.0 },
    },
    availableExpressions: [],
    defaultExpression: 'neutral',
  } as ExpressionSettingsData,
};

/**
 * Settings Store実装
 */
export const useSettingsStore = create<SettingsStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        // 初期状態
        window: null,
        chat: null,
        theme: null,
        expressions: null,

        isLoading: {
          window: false,
          chat: false,
          theme: false,
          expressions: false,
        },

        errors: {
          window: null,
          chat: null,
          theme: null,
          expressions: null,
        },

        validation: {
          window: [],
          chat: [],
          theme: [],
          expressions: [],
        },

        performance: {
          operations: new Map(),
          lastUpdateTime: Date.now(),
        },

        errorState: {
          hasError: false,
          errorHistory: [],
        },

        isInitialized: {
          window: false,
          chat: false,
          theme: false,
          expressions: false,
        },

        isDisposed: false,

        // アクション実装

        /**
         * 設定読み込み
         */
        loadSettings: async <T extends SettingsSection>(section: T) => {
          const state = get();

          // disposed状態でも再初期化を許可
          if (state.isDisposed) {
            console.log(`[SettingsStore] Store was disposed, reinitializing for ${section}...`);
            // 自動的にリセット
            set(draft => {
              draft.isDisposed = false;
            });
          }

          state.startOperation(`${section}:読み込み`, section);

          set(draft => {
            draft.isLoading[section] = true;
            draft.errors[section] = null;
          });

          try {
            console.log(`[SettingsStore] Loading ${section} settings...`);

            let data: SettingsDataMap[T];

            // ElectronAPI呼び出し（型安全）
            switch (section) {
              case 'window':
                data = (await get().loadWindowSettings()) as SettingsDataMap[T];
                break;
              case 'chat':
                data = (await get().loadChatSettings()) as SettingsDataMap[T];
                break;
              case 'theme':
                data = (await get().loadThemeSettings()) as SettingsDataMap[T];
                break;
              case 'expressions':
                data = (await get().loadExpressionSettings()) as SettingsDataMap[T];
                break;
              default:
                throw new Error(`Unknown section: ${section}`);
            }

            set(draft => {
              draft[section] = data;
              draft.isLoading[section] = false;
              draft.isInitialized[section] = true;
              draft.errors[section] = null;
            });

            console.log(`[SettingsStore] ${section} settings loaded successfully`);
          } catch (error) {
            const err = error as Error;
            get().handleError(section, err, '読み込み');

            // フォールバック: デフォルト設定を適用
            set(draft => {
              draft[section] = DEFAULT_SETTINGS[section] as any;
              draft.isLoading[section] = false;
            });
          } finally {
            state.endOperation(`${section}:読み込み`, section);
          }
        },

        /**
         * 設定更新
         */
        updateSettings: async <T extends SettingsSection>(section: T, data: SettingsDataMap[T]) => {
          const state = get();

          // disposed状態でも更新を許可
          if (state.isDisposed) {
            console.log(
              `[SettingsStore] Store was disposed, reinitializing for ${section} update...`
            );
            // 自動的にリセット
            set(draft => {
              draft.isDisposed = false;
            });
          }

          state.startOperation(`${section}:更新`, section);

          try {
            // バリデーション実行
            const validationErrors = state.validateSettings(section, data);

            set(draft => {
              draft.validation[section] = validationErrors;
            });

            if (validationErrors.length > 0) {
              console.warn(`[SettingsStore] Validation failed for ${section}:`, validationErrors);
              return;
            }

            set(draft => {
              draft.isLoading[section] = true;
              draft.errors[section] = null;
            });

            console.log(`[SettingsStore] Updating ${section} settings...`);

            // ElectronAPI保存呼び出し
            let result: OperationResult;

            switch (section) {
              case 'window':
                result = await get().saveWindowSettings(data as WindowSettingsData);
                break;
              case 'chat':
                result = await get().saveChatSettings(data as ChatSettingsData);
                break;
              case 'theme':
                result = await get().saveThemeSettings(data as ThemeSettingsData);
                break;
              case 'expressions':
                result = await get().saveExpressionSettings(data as ExpressionSettingsData);
                break;
              default:
                throw new Error(`Unknown section: ${section}`);
            }

            if (!result.success) {
              throw new Error(result.error || `Failed to save ${section} settings`);
            }

            set(draft => {
              draft[section] = data as any;
              draft.isLoading[section] = false;
              draft.errors[section] = null;
            });

            console.log(`[SettingsStore] ${section} settings updated successfully`);
          } catch (error) {
            get().handleError(section, error as Error, '更新');
          } finally {
            state.endOperation(`${section}:更新`, section);
          }
        },

        /**
         * 設定リセット
         */
        resetSettings: async <T extends SettingsSection>(section: T) => {
          const state = get();

          state.startOperation(`${section}:リセット`, section);

          try {
            const defaultData = DEFAULT_SETTINGS[section] as SettingsDataMap[T];
            await state.updateSettings(section, defaultData);

            console.log(`[SettingsStore] ${section} settings reset to defaults`);
          } catch (error) {
            get().handleError(section, error as Error, 'リセット');
          } finally {
            state.endOperation(`${section}:リセット`, section);
          }
        },

        /**
         * セクション初期化
         */
        initializeSection: async <T extends SettingsSection>(section: T) => {
          const state = get();

          if (state.isInitialized[section]) {
            console.log(`[SettingsStore] ${section} already initialized`);
            return;
          }

          console.log(`[SettingsStore] Initializing ${section} section...`);
          await state.loadSettings(section);
        },

        /**
         * 全セクション初期化
         */
        initializeAllSections: async () => {
          console.log('[SettingsStore] Initializing all sections...');

          const sections: SettingsSection[] = ['window', 'chat', 'theme', 'expressions'];

          // 並行初期化でパフォーマンス向上
          await Promise.all(sections.map(section => get().initializeSection(section)));

          console.log('[SettingsStore] All sections initialized');
        },

        /**
         * ストアリセット（テスト用）
         */
        dispose: () => {
          console.log('[SettingsStore] Resetting store...');

          set(draft => {
            // 状態を初期値にリセット
            draft.window = null;
            draft.chat = null;
            draft.theme = null;
            draft.expressions = null;

            // ローディング状態をリセット
            draft.isLoading = {
              window: false,
              chat: false,
              theme: false,
              expressions: false,
            };

            // エラー状態をリセット
            draft.errors = {
              window: null,
              chat: null,
              theme: null,
              expressions: null,
            };

            // バリデーション状態をリセット
            draft.validation = {
              window: [],
              chat: [],
              theme: [],
              expressions: [],
            };

            // 初期化状態をリセット
            draft.isInitialized = {
              window: false,
              chat: false,
              theme: false,
              expressions: false,
            };

            // disposedフラグをfalseに（再利用可能）
            draft.isDisposed = false;

            // パフォーマンス データクリア
            draft.performance.operations.clear();
            draft.performance.lastUpdateTime = Date.now();

            // エラー履歴クリア
            draft.errorState = {
              hasError: false,
              errorHistory: [],
            };
          });

          console.log('[SettingsStore] Store reset completed');
        },

        /**
         * バリデーション
         */
        validateSettings: <T extends SettingsSection>(
          section: T,
          data: SettingsDataMap[T]
        ): ValidationError[] => {
          const errors: ValidationError[] = [];

          try {
            switch (section) {
              case 'window':
                errors.push(...get().validateWindowSettings(data as WindowSettingsData));
                break;
              case 'chat':
                errors.push(...get().validateChatSettings(data as ChatSettingsData));
                break;
              case 'theme':
                errors.push(...get().validateThemeSettings(data as ThemeSettingsData));
                break;
              case 'expressions':
                errors.push(...get().validateExpressionSettings(data as ExpressionSettingsData));
                break;
            }
          } catch (error) {
            errors.push({
              field: 'validation',
              message: `バリデーション中にエラーが発生しました: ${error}`,
              value: undefined,
            });
          }

          return errors;
        },

        /**
         * バリデーションエラークリア
         */
        clearValidationErrors: (section: SettingsSection) => {
          set(draft => {
            draft.validation[section] = [];
          });
        },

        /**
         * パフォーマンス操作開始（統合型）
         */
        startOperation: (name: string, section?: SettingsSection) => {
          const operationId = section
            ? settingsPerformanceIntegrator.startSettingsOperation(section, name)
            : `global:${name}:${Date.now()}`;

          // Zustand内部状態も更新（互換性維持）
          const fullName = section ? `${section}:${name}` : name;
          set(draft => {
            draft.performance.operations.set(fullName, performance.now());
          });

          console.log(`[SettingsStore] Performance: ${fullName} started (ID: ${operationId})`);
          return operationId;
        },

        /**
         * パフォーマンス操作終了（統合型）
         */
        endOperation: (name: string, section?: SettingsSection): number => {
          const fullName = section ? `${section}:${name}` : name;
          const state = get();

          // 基本的な互換性チェック
          const startTime = state.performance.operations.get(fullName);
          if (!startTime) {
            console.warn(`[SettingsStore] No start time found for operation: ${fullName}`);
            return 0;
          }

          let duration = 0;

          // 統合パフォーマンス管理を使用
          if (section) {
            // セクション固有の操作として統合システムで終了
            const operationId = `${section}:${name}:${startTime}`;
            duration = settingsPerformanceIntegrator.endSettingsOperation(operationId, section);
          } else {
            // グローバル操作として基本的な計算
            duration = performance.now() - startTime;
          }

          // Zustand内部状態更新（互換性維持）
          set(draft => {
            draft.performance.operations.delete(fullName);
            draft.performance.lastUpdateTime = Date.now();

            // メモリ使用量更新（可能な場合）
            if ('memory' in performance) {
              draft.performance.memoryUsage = (performance as any).memory;
            }
          });

          console.log(
            `[SettingsStore] Performance: ${fullName} completed in ${duration.toFixed(2)}ms`
          );

          // パフォーマンス警告（統合システムでも実行されるが、Store単位でも確認）
          if (duration > 2000) {
            console.warn(
              `[SettingsStore] Performance warning: ${fullName} took ${duration.toFixed(2)}ms (>2s)`
            );
          }

          return duration;
        },

        /**
         * パフォーマンスメトリクス取得（統合型）
         */
        getPerformanceMetrics: (): PerformanceState & { comprehensive?: any } => {
          const storeMetrics = get().performance;

          // 統合パフォーマンスシステムからの詳細メトリクスを取得
          try {
            const comprehensiveMetrics = settingsPerformanceIntegrator.getComprehensiveMetrics();

            return {
              ...storeMetrics,
              comprehensive: comprehensiveMetrics,
            };
          } catch (error) {
            console.warn('[SettingsStore] Failed to get comprehensive metrics:', error);
            return storeMetrics;
          }
        },

        /**
         * エラーハンドリング（統合型）
         */
        handleError: (section: SettingsSection, error: Error, operation: string) => {
          console.error(`[SettingsStore] Error in ${section}:${operation}:`, error);

          // 統合エラーハンドリングシステムでエラーを記録
          try {
            settingsPerformanceIntegrator.recordSettingsError(section, error, operation);
          } catch (handlerError) {
            console.warn(
              '[SettingsStore] Failed to record error in integrated system:',
              handlerError
            );
          }

          // Zustand Store内部の状態更新（互換性維持）
          set(draft => {
            draft.errors[section] = error;
            draft.isLoading[section] = false;
            draft.errorState.hasError = true;
            draft.errorState.lastError = error;
            draft.errorState.errorHistory.push({
              error,
              timestamp: Date.now(),
              operation,
              section,
            });

            // エラー履歴の制限（最新100件）
            if (draft.errorState.errorHistory.length > 100) {
              draft.errorState.errorHistory = draft.errorState.errorHistory.slice(-100);
            }
          });
        },

        /**
         * エラークリア
         */
        clearErrors: (section?: SettingsSection) => {
          set(draft => {
            if (section) {
              draft.errors[section] = null;
            } else {
              draft.errors = {
                window: null,
                chat: null,
                theme: null,
                expressions: null,
              };
              draft.errorState.hasError = false;
              draft.errorState.lastError = undefined;
            }
          });
        },

        /**
         * エラー履歴取得
         */
        getErrorHistory: () => {
          return get().errorState.errorHistory;
        },

        /**
         * デバッグ情報取得
         */
        getDebugInfo: () => {
          const state = get();
          return {
            state: {
              window: state.window,
              chat: state.chat,
              theme: state.theme,
              expressions: state.expressions,
              isLoading: state.isLoading,
              errors: state.errors,
              validation: state.validation,
              isInitialized: state.isInitialized,
              isDisposed: state.isDisposed,
            } as SettingsStoreState,
            performance: state.performance,
            errors: state.errorState,
          };
        },

        /**
         * 統合パフォーマンスレポート取得
         */
        getComprehensivePerformanceReport: (): string => {
          try {
            return settingsPerformanceIntegrator.generatePerformanceReport();
          } catch (error) {
            console.error(
              '[SettingsStore] Failed to generate comprehensive performance report:',
              error
            );
            return `Performance Report Generation Failed: ${error instanceof Error ? error.message : String(error)}`;
          }
        },

        /**
         * 統合メトリクスリセット
         */
        resetIntegratedMetrics: () => {
          try {
            settingsPerformanceIntegrator.resetAllMetrics();
            console.log('[SettingsStore] All integrated metrics reset successfully');
          } catch (error) {
            console.error('[SettingsStore] Failed to reset integrated metrics:', error);
          }
        },

        /**
         * React コンポーネントレンダリング性能追跡
         */
        trackComponentRender: (componentName: string, renderTime: number) => {
          try {
            // 統合システムのReactPerformanceManagerを使用
            const performanceManager = (settingsPerformanceIntegrator as any).performanceManager;
            if (performanceManager && typeof performanceManager.trackReactRender === 'function') {
              performanceManager.trackReactRender(componentName, renderTime);
            }
          } catch (error) {
            console.warn('[SettingsStore] Failed to track component render:', error);
          }
        },

        // ElectronAPI呼び出しメソッド（実装）
        loadWindowSettings: async (): Promise<WindowSettingsData> => {
          console.log('[SettingsStore] Loading window settings from ElectronAPI...');

          try {
            if (!window.electronAPI) {
              throw new Error('ElectronAPI not available');
            }

            // 複数API並行呼び出しでパフォーマンス向上
            const [windowSettings, mainWindowBounds, cameraSettings] = await Promise.all([
              window.electronAPI.getSettings(),
              window.electronAPI.getMainWindowBounds().catch(() => null),
              window.electronAPI.getCameraSettings().catch(() => null),
            ]);

            // 既存SettingsDataからWindow関連データを抽出
            const windowData: WindowSettingsData = {
              windowSize: windowSettings?.windowSize || DEFAULT_SETTINGS.window.windowSize,
              vrmModelPath: windowSettings?.vrmModelPath || DEFAULT_SETTINGS.window.vrmModelPath,
              cameraSettings: cameraSettings || DEFAULT_SETTINGS.window.cameraSettings,
              mainWindowBounds: mainWindowBounds || undefined,
            };

            console.log('[SettingsStore] Window settings loaded:', windowData);
            return windowData;
          } catch (error) {
            console.error('[SettingsStore] Failed to load window settings:', error);
            throw error;
          }
        },

        loadChatSettings: async (): Promise<ChatSettingsData> => {
          console.log('[SettingsStore] Loading chat settings from ElectronAPI...');

          try {
            if (!window.electronAPI) {
              throw new Error('ElectronAPI not available');
            }

            // 複数API並行呼び出し
            const [userName, mascotName, systemPromptCore, chatWindowBounds, chatWindowVisible] =
              await Promise.all([
                window.electronAPI.getUserName().catch(() => DEFAULT_SETTINGS.chat.userName),
                window.electronAPI.getMascotName().catch(() => DEFAULT_SETTINGS.chat.mascotName),
                window.electronAPI
                  .getSystemPromptCore()
                  .catch(() => DEFAULT_SETTINGS.chat.systemPromptCore),
                window.electronAPI.getChatWindowBounds().catch(() => null),
                window.electronAPI
                  .getChatWindowVisible()
                  .catch(() => DEFAULT_SETTINGS.chat.chatWindowVisible),
              ]);

            const chatData: ChatSettingsData = {
              userName: userName || DEFAULT_SETTINGS.chat.userName,
              mascotName: mascotName || DEFAULT_SETTINGS.chat.mascotName,
              systemPromptCore: systemPromptCore || DEFAULT_SETTINGS.chat.systemPromptCore,
              chatWindowBounds: chatWindowBounds || undefined,
              chatWindowVisible: chatWindowVisible,
            };

            console.log('[SettingsStore] Chat settings loaded:', chatData);
            return chatData;
          } catch (error) {
            console.error('[SettingsStore] Failed to load chat settings:', error);
            throw error;
          }
        },

        loadThemeSettings: async (): Promise<ThemeSettingsData> => {
          console.log('[SettingsStore] Loading theme settings from ElectronAPI...');

          try {
            if (!window.electronAPI) {
              throw new Error('ElectronAPI not available');
            }

            // テーマ関連API並行呼び出し
            const [currentTheme, availableThemes] = await Promise.all([
              window.electronAPI.getTheme().catch(() => DEFAULT_SETTINGS.theme.currentTheme),
              window.electronAPI.getAvailableThemes().catch(() => []),
            ]);

            const themeData: ThemeSettingsData = {
              currentTheme: currentTheme || DEFAULT_SETTINGS.theme.currentTheme,
              availableThemes: availableThemes || [],
            };

            console.log('[SettingsStore] Theme settings loaded:', themeData);
            return themeData;
          } catch (error) {
            console.error('[SettingsStore] Failed to load theme settings:', error);
            throw error;
          }
        },

        loadExpressionSettings: async (): Promise<ExpressionSettingsData> => {
          console.log('[SettingsStore] Loading expression settings from ElectronAPI...');

          try {
            if (!window.electronAPI) {
              throw new Error('ElectronAPI not available');
            }

            // 表情関連API並行呼び出し
            const [expressionSettings, availableExpressions, defaultExpression] = await Promise.all(
              [
                window.electronAPI
                  .getExpressionSettings()
                  .catch(() => DEFAULT_SETTINGS.expressions.settings),
                window.electronAPI.getAvailableExpressions().catch(() => []),
                window.electronAPI
                  .getDefaultExpression()
                  .catch(() => DEFAULT_SETTINGS.expressions.defaultExpression),
              ]
            );

            const expressionsData: ExpressionSettingsData = {
              settings: expressionSettings || DEFAULT_SETTINGS.expressions.settings,
              availableExpressions: availableExpressions || [],
              defaultExpression:
                defaultExpression || DEFAULT_SETTINGS.expressions.defaultExpression,
            };

            console.log('[SettingsStore] Expression settings loaded:', expressionsData);
            return expressionsData;
          } catch (error) {
            console.error('[SettingsStore] Failed to load expression settings:', error);
            throw error;
          }
        },

        saveWindowSettings: async (data: WindowSettingsData): Promise<OperationResult> => {
          console.log('[SettingsStore] Saving window settings to ElectronAPI...', data);

          try {
            if (!window.electronAPI) {
              throw new Error('ElectronAPI not available');
            }

            // 複数設定の保存を並行実行
            const savePromises = [];

            // 基本設定保存
            const settingsData = {
              windowSize: data.windowSize,
              vrmModelPath: data.vrmModelPath,
              cameraSettings: data.cameraSettings,
            };
            savePromises.push(window.electronAPI.saveAllDisplaySettings(settingsData));

            // カメラ設定保存
            if (data.cameraSettings) {
              savePromises.push(window.electronAPI.setCameraSettings(data.cameraSettings));
            }

            // ウィンドウ境界保存
            if (data.mainWindowBounds) {
              savePromises.push(window.electronAPI.setMainWindowBounds(data.mainWindowBounds));
            }

            const results = await Promise.all(savePromises);

            // 結果確認
            const allSuccess = results.every(result => result.success);

            if (!allSuccess) {
              const errors = results.filter(result => !result.success);
              throw new Error(`設定保存の一部が失敗しました: ${errors.length}件のエラー`);
            }

            console.log('[SettingsStore] Window settings saved successfully');
            return { success: true };
          } catch (error) {
            console.error('[SettingsStore] Failed to save window settings:', error);
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },

        saveChatSettings: async (data: ChatSettingsData): Promise<OperationResult> => {
          console.log('[SettingsStore] Saving chat settings to ElectronAPI...', data);

          try {
            if (!window.electronAPI) {
              throw new Error('ElectronAPI not available');
            }

            // チャット設定の並行保存
            const savePromises = [
              window.electronAPI.setUserName(data.userName),
              window.electronAPI.setMascotName(data.mascotName),
              window.electronAPI.setSystemPromptCore(data.systemPromptCore),
              window.electronAPI.setChatWindowVisible(data.chatWindowVisible),
            ];

            // チャットウィンドウ境界保存（存在する場合）
            if (data.chatWindowBounds) {
              savePromises.push(window.electronAPI.setChatWindowBounds(data.chatWindowBounds));
            }

            const results = await Promise.all(savePromises);

            const allSuccess = results.every(result => result.success);

            if (!allSuccess) {
              const errors = results.filter(result => !result.success);
              throw new Error(`チャット設定保存の一部が失敗しました: ${errors.length}件のエラー`);
            }

            console.log('[SettingsStore] Chat settings saved successfully');
            return { success: true };
          } catch (error) {
            console.error('[SettingsStore] Failed to save chat settings:', error);
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },

        saveThemeSettings: async (data: ThemeSettingsData): Promise<OperationResult> => {
          console.log('[SettingsStore] Saving theme settings to ElectronAPI...', data);

          try {
            if (!window.electronAPI) {
              throw new Error('ElectronAPI not available');
            }

            // テーマ設定保存
            const result = await window.electronAPI.setTheme(data.currentTheme);

            if (!result.success) {
              throw new Error('テーマ設定の保存に失敗しました');
            }

            console.log('[SettingsStore] Theme settings saved successfully');
            return { success: true };
          } catch (error) {
            console.error('[SettingsStore] Failed to save theme settings:', error);
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },

        saveExpressionSettings: async (data: ExpressionSettingsData): Promise<OperationResult> => {
          console.log('[SettingsStore] Saving expression settings to ElectronAPI...', data);

          try {
            if (!window.electronAPI) {
              throw new Error('ElectronAPI not available');
            }

            // 表情設定の並行保存
            const savePromises = [
              window.electronAPI.setExpressionSettings(data.settings),
              window.electronAPI.setDefaultExpression(data.defaultExpression),
            ];

            // tools.json更新とGemini再初期化
            savePromises.push(window.electronAPI.updateToolsAndReinitializeGemini());

            const results = await Promise.all(savePromises);

            const allSuccess = results.every(result => result.success);

            if (!allSuccess) {
              const errors = results.filter(result => !result.success);
              console.warn('[SettingsStore] Some expression settings failed to save:', errors);

              // tools.json更新失敗は警告レベル（設定保存自体は成功とみなす）
              const criticalFailures = results.slice(0, 2).filter(result => !result.success);
              if (criticalFailures.length > 0) {
                throw new Error(
                  `表情設定保存の一部が失敗しました: ${criticalFailures.length}件のエラー`
                );
              }
            }

            console.log('[SettingsStore] Expression settings saved successfully');
            return { success: true };
          } catch (error) {
            console.error('[SettingsStore] Failed to save expression settings:', error);
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },

        // バリデーションメソッド（統合実装）
        validateWindowSettings: (data: WindowSettingsData): ValidationError[] => {
          return validateWindowSettings(data);
        },

        validateChatSettings: (data: ChatSettingsData): ValidationError[] => {
          return validateChatSettings(data);
        },

        validateThemeSettings: (data: ThemeSettingsData): ValidationError[] => {
          return validateThemeSettings(data);
        },

        validateExpressionSettings: (data: ExpressionSettingsData): ValidationError[] => {
          return validateExpressionSettings(data);
        },
      })),
      {
        name: 'SettingsStore',
        version: 1,
      }
    )
  )
);

// Store用型定義エクスポート
export type {
  SettingsStoreState,
  SettingsStoreActions,
  SettingsDataMap,
  WindowSettingsData,
  ChatSettingsData,
  ThemeSettingsData,
  ExpressionSettingsData,
  OperationResult,
  PerformanceState,
  ErrorState,
};

// デフォルト設定エクスポート
export { DEFAULT_SETTINGS };

export default useSettingsStore;
