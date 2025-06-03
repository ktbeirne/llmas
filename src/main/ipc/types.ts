/**
 * IPC通信の型安全性を確保するための型定義
 */

import { IpcMainInvokeEvent } from 'electron';

import { SettingsData, CameraSettings, WindowBounds } from '../../utils/settingsStore';
import { ExpressionSettings } from '../../types/tools';

// =============================================================================
// 基本型定義
// =============================================================================

/**
 * 標準的なIPC応答型
 */
export interface IPCResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

/**
 * 成功応答を作成するヘルパー
 */
export function createSuccessResponse<T>(data?: T): IPCResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * エラー応答を作成するヘルパー
 */
export function createErrorResponse(error: string): IPCResponse {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };
}

/**
 * IPCハンドラーの関数型
 */
export type IPCHandler<TRequest = unknown, TResponse = unknown> = (
  event: IpcMainInvokeEvent,
  ...args: TRequest[]
) => Promise<IPCResponse<TResponse>>;

// =============================================================================
// 設定関連型定義
// =============================================================================

/**
 * 設定取得リクエスト型
 */
export interface GetSettingsRequest {
  // 現在は引数なし
}

/**
 * 設定取得レスポンス型
 */
export interface GetSettingsResponse {
  settings: SettingsData;
}

/**
 * 設定保存リクエスト型
 */
export interface SaveSettingsRequest {
  settings: SettingsData;
  validateOnly?: boolean;
}

/**
 * 設定保存レスポンス型
 */
export interface SaveSettingsResponse {
  settings: SettingsData;
  validationErrors?: string[];
}

/**
 * VRMファイル選択レスポンス型
 */
export interface SelectVrmFileResponse {
  filePath: string | null;
}

// =============================================================================
// ウィンドウ制御関連型定義
// =============================================================================

/**
 * ウィンドウ表示切り替えリクエスト型
 */
export interface ToggleWindowRequest {
  windowType: 'chat' | 'settings' | 'speechBubble';
  forceState?: boolean; // true: 表示, false: 非表示
}

/**
 * ウィンドウ位置設定リクエスト型
 */
export interface SetWindowBoundsRequest {
  windowType: 'main' | 'chat';
  bounds: WindowBounds;
}

/**
 * ウィンドウ位置取得レスポンス型
 */
export interface GetWindowBoundsResponse {
  bounds: WindowBounds;
}

/**
 * チャットウィンドウ表示状態設定リクエスト型
 */
export interface SetChatVisibleRequest {
  visible: boolean;
}

/**
 * チャットウィンドウ表示状態取得レスポンス型
 */
export interface GetChatVisibleResponse {
  visible: boolean;
}

// =============================================================================
// カメラ設定関連型定義
// =============================================================================

/**
 * カメラ設定取得レスポンス型
 */
export interface GetCameraSettingsResponse {
  settings: CameraSettings;
}

/**
 * カメラ設定保存リクエスト型
 */
export interface SetCameraSettingsRequest {
  settings: CameraSettings;
}

/**
 * カメラ設定リセットレスポンス型
 */
export interface ResetCameraSettingsResponse {
  settings: CameraSettings;
}

// =============================================================================
// チャット関連型定義
// =============================================================================

/**
 * チャットメッセージ送信リクエスト型
 */
export interface SendChatMessageRequest {
  message: string;
  role?: 'user' | 'assistant' | 'system';
  includeHistory?: boolean;
}

/**
 * チャットメッセージ送信レスポンス型
 */
export interface SendChatMessageResponse {
  response: string;
  messageId: string;
  timestamp: string;
}

/**
 * チャット履歴取得レスポンス型
 */
export interface GetChatHistoryResponse {
  history: ChatMessage[];
  totalCount: number;
}

/**
 * チャットメッセージ型
 */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

/**
 * システムプロンプト設定リクエスト型
 */
export interface SetSystemPromptRequest {
  prompt: string;
  core?: boolean; // trueの場合はcore部分のみ設定
}

/**
 * システムプロンプト取得レスポンス型
 */
export interface GetSystemPromptResponse {
  prompt: string;
  core?: string;
}

/**
 * ユーザー名設定リクエスト型
 */
export interface SetUserNameRequest {
  userName: string;
}

/**
 * マスコット名設定リクエスト型
 */
export interface SetMascotNameRequest {
  mascotName: string;
}

// =============================================================================
// VRM/表情関連型定義
// =============================================================================

/**
 * 表情設定取得レスポンス型
 */
export interface GetExpressionSettingsResponse {
  settings: ExpressionSettings;
}

/**
 * 表情設定保存リクエスト型
 */
export interface SetExpressionSettingsRequest {
  settings: ExpressionSettings;
}

/**
 * デフォルト表情設定リクエスト型
 */
export interface SetDefaultExpressionRequest {
  expression: string;
}

/**
 * デフォルト表情取得レスポンス型
 */
export interface GetDefaultExpressionResponse {
  expression: string;
}

// =============================================================================
// テーマ関連型定義
// =============================================================================

/**
 * テーマ設定リクエスト型
 */
export interface SetThemeRequest {
  theme: string;
}

/**
 * テーマ取得レスポンス型
 */
export interface GetThemeResponse {
  theme: string;
}

/**
 * 利用可能テーマ取得レスポンス型
 */
export interface GetAvailableThemesResponse {
  themes: string[];
}

// =============================================================================
// 画面表示設定関連型定義
// =============================================================================

/**
 * 画面表示設定一括保存リクエスト型
 */
export interface SaveAllDisplaySettingsRequest {
  settings: SettingsData;
}

/**
 * 画面表示設定一括リセットレスポンス型
 */
export interface ResetAllDisplaySettingsResponse {
  settings: SettingsData;
}

// =============================================================================
// バリデーション関連型定義
// =============================================================================

/**
 * バリデーション結果型
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

/**
 * バリデーションエラー型
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

/**
 * バリデーション警告型
 */
export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

// =============================================================================
// IPCチャンネル型マッピング
// =============================================================================

/**
 * IPCチャンネルとリクエスト・レスポンス型のマッピング
 */
export interface IPCChannelMap {
  // 設定関連
  'get-settings': {
    request: GetSettingsRequest;
    response: GetSettingsResponse;
  };
  'save-settings': {
    request: SaveSettingsRequest;
    response: SaveSettingsResponse;
  };
  'reset-settings': {
    request: {};
    response: GetSettingsResponse;
  };
  'select-vrm-file': {
    request: {};
    response: SelectVrmFileResponse;
  };

  // ウィンドウ制御
  'toggle-chat-visibility': {
    request: {};
    response: {};
  };
  'quit-app': {
    request: {};
    response: {};
  };
  'toggle-settings-window': {
    request: {};
    response: {};
  };
  'open-settings': {
    request: {};
    response: {};
  };
  'close-settings': {
    request: {};
    response: {};
  };

  // ウィンドウ位置
  'get-main-window-bounds': {
    request: {};
    response: GetWindowBoundsResponse;
  };
  'set-main-window-bounds': {
    request: SetWindowBoundsRequest;
    response: IPCResponse;
  };
  'get-chat-window-bounds': {
    request: {};
    response: GetWindowBoundsResponse;
  };
  'set-chat-window-bounds': {
    request: SetWindowBoundsRequest;
    response: IPCResponse;
  };
  'get-chat-window-visible': {
    request: {};
    response: GetChatVisibleResponse;
  };
  'set-chat-window-visible': {
    request: SetChatVisibleRequest;
    response: IPCResponse;
  };

  // カメラ設定
  'get-camera-settings': {
    request: {};
    response: GetCameraSettingsResponse;
  };
  'set-camera-settings': {
    request: SetCameraSettingsRequest;
    response: IPCResponse;
  };
  'reset-camera-settings': {
    request: {};
    response: ResetCameraSettingsResponse;
  };

  // 画面表示設定
  'save-all-display-settings': {
    request: SaveAllDisplaySettingsRequest;
    response: IPCResponse;
  };
  'reset-all-display-settings': {
    request: {};
    response: ResetAllDisplaySettingsResponse;
  };
}

// =============================================================================
// 型安全性ヘルパー
// =============================================================================

/**
 * IPCチャンネル名の型安全性を確保する型
 */
export type IPCChannelName = keyof IPCChannelMap;

/**
 * 特定のIPCチャンネルのリクエスト型を取得
 */
export type IPCRequestType<T extends IPCChannelName> = IPCChannelMap[T]['request'];

/**
 * 特定のIPCチャンネルのレスポンス型を取得
 */
export type IPCResponseType<T extends IPCChannelName> = IPCChannelMap[T]['response'];

/**
 * 型ガード：オブジェクトが指定された型に適合するかチェック
 */
export function isValidType<T>(obj: unknown, validator: (obj: unknown) => obj is T): obj is T {
  return validator(obj);
}

/**
 * 文字列の型ガード
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * 数値の型ガード
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * ブール値の型ガード
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * オブジェクトの型ガード
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 配列の型ガード
 */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}