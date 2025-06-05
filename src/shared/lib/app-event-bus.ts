/**
 * Application Event Bus - FSD Phase 1.1
 * アプリケーション全体で使用するグローバルイベントバスインスタンス
 */

import { AppEventMap } from '@shared/types/events';

import { createEventBus } from './event-bus';

// グローバルイベントバスインスタンス（拡張オプション付き）
export const eventBus = createEventBus<AppEventMap>({
  maxListeners: 200, // アプリケーション全体で使用するため増加
  enableHistory: process.env.NODE_ENV === 'development',
  historySize: 200,
  errorHandler: (error, event, payload) => {
    console.error(`[EventBus Error] Event: ${event}`, error);
    console.error('Payload:', payload);
    
    // グローバルエラーイベントを発火（無限ループ防止）
    if (event !== 'app:error') {
      eventBus.emit('app:error', {
        error,
        context: `EventBus handler for ${event}`
      });
    }
  }
});

// デバッグ用のイベントログ機能（開発環境のみ）
if (process.env.NODE_ENV === 'development') {
  // 主要イベントの監視
  const monitoredEvents: (keyof AppEventMap)[] = [
    'app:ready',
    'app:error',
    'mouse-follow:enabled',
    'vrm:animation-started',
    'chat:message-sent',
    'settings:changed'
  ];

  monitoredEvents.forEach(eventName => {
    eventBus.subscribe(eventName, (payload) => {
      console.log(`🔊 [EventBus] ${String(eventName)}:`, payload);
    });
  });
}