/**
 * IPC通信用の型定義
 * Electron main process と renderer process 間の型安全な通信を実現
 */

// 既存の型定義をインポート
import { ChatMessage } from '../utils/chatHistoryStore';
import { WindowBounds, CameraSettings, SettingsData } from '../utils/settingsStore';

import { ExpressionSettings, VRMExpressionInfo } from './tools';

/**
 * 共通のAPI応答型
 */
export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * 成功応答の型
 */
export interface SuccessResponse<T = void> extends ApiResponse<T> {
  success: true;
  data: T;
}

/**
 * エラー応答の型
 */
export interface ErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
}

/**
 * テーマ関連の型定義
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
 * チャット履歴のクリア結果
 */
export interface ChatHistoryClearResult {
  success: boolean;
  error?: string;
}

/**
 * ウィンドウサイズ通知用の型
 */
export interface WindowSize {
  width: number;
  height: number;
}

/**
 * IPC Main Process APIs の型定義
 * これらの型は preload.d.ts の ElectronAPI に対応
 */
export namespace IPCTypes {
  
  // Gemini関連
  export type SendPromptToGemini = (prompt: string) => Promise<string>;
  
  // スピーチバブル関連
  export type OnSetSpeechBubbleText = (callback: (text: string) => void) => void;
  export type HideSpeechBubble = () => void;
  export type NotifyBubbleSize = (size: WindowSize) => void;
  
  // ログ関連
  export type LogRendererMessage = (message: string) => void;
  
  // チャットウィンドウ関連
  export type ToggleChatWindowVisibility = () => void;
  export type OnChatWindowStateChanged = (callback: (isVisible: boolean) => void) => void;
  
  // アプリケーション制御
  export type QuitApp = () => void;
  
  // 設定ウィンドウ関連
  export type OpenSettings = () => void;
  export type CloseSettings = () => void;
  export type ToggleSettingsWindow = () => void;
  export type OnSettingsWindowStateChanged = (callback: (isOpen: boolean) => void) => void;
  
  // 設定関連
  export type GetSettings = () => Promise<SettingsData>;
  export type SaveSettings = (settings: SettingsData) => Promise<ApiResponse>;
  export type ResetSettings = () => Promise<ApiResponse>;
  export type SelectVrmFile = () => Promise<string | null>;
  
  // チャット関連
  export type SendChatMessage = (message: string) => Promise<string>;
  export type GetChatHistory = () => Promise<ChatMessage[]>;
  export type ClearChatHistory = () => Promise<ChatHistoryClearResult>;
  
  // システムプロンプト関連
  export type GetSystemPrompt = () => Promise<string>;
  export type SetSystemPrompt = (prompt: string) => Promise<ApiResponse>;
  export type ResetSystemPrompt = () => Promise<ApiResponse>;
  
  // カメラ設定関連
  export type GetCameraSettings = () => Promise<CameraSettings>;
  export type SetCameraSettings = (settings: CameraSettings) => Promise<ApiResponse>;
  export type ResetCameraSettings = () => Promise<ApiResponse>;
  
  // ウィンドウ位置関連
  export type GetMainWindowBounds = () => Promise<WindowBounds>;
  export type SetMainWindowBounds = (bounds: WindowBounds) => Promise<ApiResponse>;
  export type GetChatWindowBounds = () => Promise<WindowBounds>;
  export type SetChatWindowBounds = (bounds: WindowBounds) => Promise<ApiResponse>;
  export type GetChatWindowVisible = () => Promise<boolean>;
  export type SetChatWindowVisible = (visible: boolean) => Promise<ApiResponse>;
  
  // 画面表示設定の一括操作
  export type SaveAllDisplaySettings = (settings: SettingsData) => Promise<ApiResponse>;
  export type ResetAllDisplaySettings = () => Promise<ApiResponse>;
  
  // ユーザー名・マスコット名関連
  export type GetUserName = () => Promise<string>;
  export type SetUserName = (userName: string) => Promise<ApiResponse>;
  export type GetMascotName = () => Promise<string>;
  export type SetMascotName = (mascotName: string) => Promise<ApiResponse>;
  
  // システムプロンプトコア関連
  export type GetSystemPromptCore = () => Promise<string>;
  export type SetSystemPromptCore = (prompt: string) => Promise<ApiResponse>;
  export type ResetSystemPromptCore = () => Promise<ApiResponse>;
  
  // テーマ関連
  export type GetTheme = () => Promise<string>;
  export type SetTheme = (theme: string) => Promise<ApiResponse>;
  export type GetAvailableThemes = () => Promise<ThemeInfo[]>;
  export type OnThemeChanged = (callback: (theme: string) => void) => void;
  
  // 表情関連
  export type GetAvailableExpressions = () => Promise<VRMExpressionInfo[]>;
  export type GetExpressionSettings = () => Promise<ExpressionSettings>;
  export type SetExpressionSettings = (settings: ExpressionSettings) => Promise<ApiResponse>;
  export type UpdateExpressionSetting = (expressionName: string, enabled: boolean, defaultWeight: number) => Promise<ApiResponse>;
  export type ResetExpressionSettings = () => Promise<ApiResponse>;
  export type PreviewExpression = (expressionName: string, intensity?: number) => Promise<ApiResponse>;
  export type UpdateToolsAndReinitializeGemini = () => Promise<ApiResponse<void> & { error?: string }>;
  
  // デフォルト表情関連
  export type GetDefaultExpression = () => Promise<string>;
  export type SetDefaultExpression = (expressionName: string) => Promise<ApiResponse>;
  export type ResetToDefaultExpression = () => Promise<ApiResponse>;
}

/**
 * IPC Main Handler の引数型定義
 * main.ts の ipcMain.handle に使用される型
 */
export namespace IPCHandlerArgs {
  export interface SaveSettings {
    settings: SettingsData;
  }
  
  export interface SetCameraSettings {
    settings: CameraSettings;
  }
  
  export interface SetMainWindowBounds {
    bounds: WindowBounds;
  }
  
  export interface SetChatWindowBounds {
    bounds: WindowBounds;
  }
  
  export interface SaveAllDisplaySettings {
    settings: SettingsData;
  }
  
  export interface SetExpressionSettings {
    settings: ExpressionSettings;
  }
  
  export interface UpdateExpressionSetting {
    expressionName: string;
    enabled: boolean;
    defaultWeight: number;
  }
  
  export interface PreviewExpression {
    expressionName: string;
    intensity?: number;
  }
}

/**
 * Renderer Global Types
 * renderer プロセスでグローバルオブジェクトに追加される型
 */
export interface VRMExpressionGlobal {
  setExpression: (name: string, intensity?: number) => void;
  getAvailableExpressions: () => VRMExpressionInfo[];
  resetToDefaultExpression: () => void;
  applyExpression: (expressionName: string, intensity?: number) => boolean;
}

export interface ThemeManagerGlobal {
  setTheme: (themeId: string) => void;
  getCurrentTheme: () => string;
  getAvailableThemes: () => ThemeInfo[];
}

/**
 * グローバルウィンドウオブジェクトの拡張
 */
declare global {
  interface Window {
    vrmExpression?: VRMExpressionGlobal;
    themeManager?: ThemeManagerGlobal;
  }
}