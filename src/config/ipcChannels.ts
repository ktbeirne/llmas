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
  },
  
  // アプリケーション制御
  APP: {
    QUIT: 'quit-app',
  },
} as const;

// 型安全性のためのヘルパー型
export type IPCChannelKey = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS][keyof typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]];