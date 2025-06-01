/**
 * IPCチャンネル名を一元管理
 */

export const IPC_CHANNELS = {
  // チャット関連
  CHAT: {
    SEND_MESSAGE: 'send-message',
    RECEIVE_RESPONSE: 'receive-response',
    OPEN_WINDOW: 'open-chat',
    CLOSE_WINDOW: 'close-chat',
    GET_HISTORY: 'get-chat-history',
    CLEAR_HISTORY: 'clear-chat-history',
    GET_SYSTEM_PROMPT: 'get-system-prompt',
    SET_SYSTEM_PROMPT: 'set-system-prompt',
    RESET_SYSTEM_PROMPT: 'reset-system-prompt',
    // ユーザー名・マスコット名関連
    GET_USER_NAME: 'get-user-name',
    SET_USER_NAME: 'set-user-name',
    GET_MASCOT_NAME: 'get-mascot-name',
    SET_MASCOT_NAME: 'set-mascot-name',
    // システムプロンプトコア関連
    GET_SYSTEM_PROMPT_CORE: 'get-system-prompt-core',
    SET_SYSTEM_PROMPT_CORE: 'set-system-prompt-core',
    RESET_SYSTEM_PROMPT_CORE: 'reset-system-prompt-core',
  },
  
  // スピーチバブル関連
  SPEECH_BUBBLE: {
    SHOW: 'show-speech-bubble',
    HIDE: 'hide-speech-bubble',
    UPDATE_POSITION: 'update-speech-bubble-position',
  },
  
  // ウィンドウ管理
  WINDOW: {
    GET_MAIN_POSITION: 'get-main-window-position',
    ALL_CLOSED: 'window-all-closed',
    GET_MAIN_BOUNDS: 'get-main-window-bounds',
    SET_MAIN_BOUNDS: 'set-main-window-bounds',
    GET_CHAT_BOUNDS: 'get-chat-window-bounds',
    SET_CHAT_BOUNDS: 'set-chat-window-bounds',
    GET_CHAT_VISIBLE: 'get-chat-window-visible',
    SET_CHAT_VISIBLE: 'set-chat-window-visible',
  },
  
  // カメラ設定
  CAMERA: {
    GET_SETTINGS: 'get-camera-settings',
    SET_SETTINGS: 'set-camera-settings',
    RESET_SETTINGS: 'reset-camera-settings',
  },
  
  // 画面表示設定
  DISPLAY: {
    SAVE_ALL_SETTINGS: 'save-all-display-settings',
    RESET_ALL_SETTINGS: 'reset-all-display-settings',
  },
  
  // アプリケーション制御
  APP: {
    QUIT: 'quit-app',
    BEFORE_QUIT: 'before-quit',
  },
  
  // テーマ関連
  THEME: {
    GET_THEME: 'get-theme',
    SET_THEME: 'set-theme',
    GET_AVAILABLE_THEMES: 'get-available-themes',
  },
  
  // 表情関連
  EXPRESSION: {
    GET_DEFAULT_EXPRESSION: 'get-default-expression',
    SET_DEFAULT_EXPRESSION: 'set-default-expression',
    RESET_TO_DEFAULT: 'reset-expression-to-default',
  },
} as const;

// 型安全性のためのヘルパー型
export type IPCChannelKey = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS][keyof typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]];