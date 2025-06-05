/**
 * Settings Types - FSD Phase 2
 * 設定機能の型定義
 */

/**
 * チャット設定
 */
export interface ChatSettings {
  // API設定
  apiProvider: 'gemini' | 'openai' | 'anthropic';
  apiKey: string;
  
  // チャット動作設定
  systemPrompt: string;
  maxTokens: number;
  temperature: number;
  
  // 履歴設定
  saveHistory: boolean;
  maxHistoryItems: number;
  
  // UI設定
  showTimestamp: boolean;
  fontSize: 'small' | 'medium' | 'large';
  theme: 'light' | 'dark' | 'auto';
}

/**
 * 表示設定
 */
export interface DisplaySettings {
  // ウィンドウ設定
  windowWidth: number;
  windowHeight: number;
  alwaysOnTop: boolean;
  windowOpacity: number;
  
  // 位置設定
  defaultPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' | 'custom';
  customX?: number;
  customY?: number;
  
  // レンダリング設定
  antialiasing: boolean;
  shadowQuality: 'low' | 'medium' | 'high';
  fps: 30 | 60;
}

/**
 * 表情設定
 */
export interface ExpressionSettings {
  // 自動表情
  enableAutoExpressions: boolean;
  expressionChangeInterval: number; // 秒
  
  // まばたき設定
  enableBlink: boolean;
  blinkIntervalMin: number; // 秒
  blinkIntervalMax: number; // 秒
  
  // 表情強度
  expressionIntensity: number; // 0.0 - 1.0
  
  // カスタム表情マッピング
  customExpressions: Record<string, string>;
}

/**
 * マウス追従設定（既存のMouseFollowSettingsと統合）
 */
export interface MouseFollowSettings {
  enabled: boolean;
  sensitivity: number;      // 0.0 - 1.0
  smoothing: number;        // 0.0 - 1.0
  deadZone: number;         // ピクセル
  updateFrequency: number;  // ミリ秒
}

/**
 * VRMモデル設定
 */
export interface VRMSettings {
  modelPath: string | null;
  animationPath: string | null;
  
  // スケール設定
  modelScale: number;
  
  // 物理演算設定
  enablePhysics: boolean;
  physicsQuality: 'low' | 'medium' | 'high';
  
  // SpringBone設定
  enableSpringBone: boolean;
  springBoneStiffness: number;
  springBoneDamping: number;
}

/**
 * 音声設定
 */
export interface AudioSettings {
  // TTS設定
  enableTTS: boolean;
  ttsVoice: string;
  ttsSpeed: number;
  ttsVolume: number;
  
  // 効果音設定
  enableSoundEffects: boolean;
  soundEffectsVolume: number;
}

/**
 * 統合設定
 */
export interface AppSettings {
  chat: ChatSettings;
  display: DisplaySettings;
  expression: ExpressionSettings;
  mouseFollow: MouseFollowSettings;
  vrm: VRMSettings;
  audio: AudioSettings;
  
  // メタ情報
  version: string;
  lastUpdated: number;
}

/**
 * 設定カテゴリ
 */
export type SettingsCategory = keyof Omit<AppSettings, 'version' | 'lastUpdated'>;

/**
 * 設定変更イベント
 */
export interface SettingsChangeEvent<T = any> {
  category: SettingsCategory;
  key: string;
  oldValue: T;
  newValue: T;
}

/**
 * 設定検証エラー
 */
export interface SettingsValidationError {
  category: SettingsCategory;
  key: string;
  message: string;
  value: any;
}

/**
 * 設定エクスポート/インポート形式
 */
export interface SettingsExportData {
  settings: AppSettings;
  exportedAt: number;
  appVersion: string;
  platform: string;
}

/**
 * エラー型
 */
export class SettingsLoadError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SettingsLoadError';
  }
}

export class SettingsSaveError extends Error {
  constructor(message: string, public cause?: Error) {
    super(message);
    this.name = 'SettingsSaveError';
  }
}

export class SettingsValidationException extends Error {
  constructor(
    message: string,
    public errors: SettingsValidationError[]
  ) {
    super(message);
    this.name = 'SettingsValidationException';
  }
}