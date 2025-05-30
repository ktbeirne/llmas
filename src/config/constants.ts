/**
 * アプリケーション全体で使用される定数を定義
 */

export const WINDOW_CONFIG = {
  MAIN: {
    WIDTH: 400,
    HEIGHT: 600,
    MIN_WIDTH: 300,
    MIN_HEIGHT: 400,
  },
  CHAT: {
    WIDTH: 400,
    HEIGHT: 500,
    MIN_WIDTH: 300,
    MIN_HEIGHT: 300,
  },
  SPEECH_BUBBLE: {
    WIDTH: 300,
    HEIGHT: 150,
    MIN_DISPLAY_TIME: 3000, // 最小表示時間（ミリ秒）
    CHARS_PER_SECOND: 10, // 1秒あたりの文字数
  },
} as const;

export const ANIMATION = {
  INTERVAL: 150, // アニメーション間隔（ミリ秒）
  FADE_DURATION: 200, // フェードアウト時間（ミリ秒）
} as const;

export const PATHS = {
  SPEECH_BUBBLE_HTML: 'speech_bubble/index.html',
  CHAT_HTML: 'chat.html',
} as const;

export const APP_CONFIG = {
  QUIT_DELAY: 100, // アプリ終了前の待機時間（ミリ秒）
} as const;