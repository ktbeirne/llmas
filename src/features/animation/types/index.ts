/**
 * Animation Feature Types - FSD Phase 2
 * アニメーション機能の型定義
 */

/**
 * アニメーションカテゴリ
 */
export type AnimationCategory = 
  | 'idle'      // アイドル・待機アニメーション
  | 'gesture'   // ジェスチャー・動作
  | 'emotion'   // 感情表現
  | 'interaction' // インタラクション
  | 'transition' // 状態遷移
  | 'custom'    // カスタム
  | 'unknown';  // 不明・未分類

/**
 * アニメーション優先度
 */
export type AnimationPriority = 
  | 'background' // 背景・常時実行（アイドルなど）
  | 'normal'     // 通常
  | 'high'       // 高優先度
  | 'critical';  // 最高優先度（割り込み可能）

/**
 * アニメーション情報
 */
export interface AnimationInfo {
  name: string;
  category: AnimationCategory;
  priority: AnimationPriority;
  duration?: number; // ミリ秒
  isLooping: boolean;
  canBeInterrupted: boolean;
  description?: string;
}

/**
 * アニメーション再生状態
 */
export interface AnimationPlayState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  speed: number;
  isLooping: boolean;
}

/**
 * アニメーション制御オプション
 */
export interface AnimationPlayOptions {
  speed?: number;          // 再生速度（デフォルト: 1.0）
  loop?: boolean;          // ループ再生（デフォルト: false）
  fadeInDuration?: number; // フェードイン時間（ミリ秒）
  fadeOutDuration?: number; // フェードアウト時間（ミリ秒）
  startTime?: number;      // 開始位置（秒）
  priority?: AnimationPriority; // 優先度（デフォルト: 'normal'）
  allowInterrupt?: boolean; // 割り込み許可（デフォルト: true）
}

/**
 * アニメーション分類ルール
 */
export interface AnimationClassificationRule {
  pattern: RegExp | string;
  category: AnimationCategory;
  priority: AnimationPriority;
  isLooping?: boolean;
  canBeInterrupted?: boolean;
}

/**
 * アニメーション分類設定
 */
export interface AnimationClassificationConfig {
  rules: AnimationClassificationRule[];
  defaultCategory: AnimationCategory;
  defaultPriority: AnimationPriority;
  idleDetectionPatterns: (RegExp | string)[];
}

/**
 * アニメーション状態
 */
export interface AnimationState {
  currentAnimation: AnimationInfo | null;
  isPlaying: boolean;
  isPaused: boolean;
  queue: AnimationInfo[];
  history: AnimationInfo[];
  lastActivityTime: number;
}

/**
 * アニメーション設定
 */
export interface AnimationSettings {
  enableAutoPlay: boolean;
  defaultSpeed: number;
  maxQueueLength: number;
  idleTimeout: number; // アイドル状態への移行時間（ミリ秒）
  enableSmoothing: boolean;
  classification: AnimationClassificationConfig;
}

/**
 * アニメーション変更イベント
 */
export interface AnimationChangeEvent {
  type: 'started' | 'stopped' | 'paused' | 'resumed' | 'completed' | 'interrupted';
  animation: AnimationInfo;
  timestamp: number;
  previousAnimation?: AnimationInfo;
}

/**
 * アニメーション分類結果
 */
export interface AnimationClassificationResult {
  category: AnimationCategory;
  priority: AnimationPriority;
  isLooping: boolean;
  canBeInterrupted: boolean;
  confidence: number; // 分類の信頼度（0.0 - 1.0）
  appliedRule?: AnimationClassificationRule;
}

/**
 * アニメーション検証エラー
 */
export interface AnimationValidationError {
  type: 'missing_file' | 'invalid_format' | 'duration_mismatch' | 'classification_failed';
  message: string;
  animationName: string;
  details?: any;
}

/**
 * アニメーション統計情報
 */
export interface AnimationStats {
  totalAnimations: number;
  byCategory: Record<AnimationCategory, number>;
  byPriority: Record<AnimationPriority, number>;
  averageDuration: number;
  mostUsedAnimation: string | null;
  lastPlayedAnimation: string | null;
}