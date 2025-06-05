/**
 * Event Bus Tests - FSD Phase 0.6
 * イベントバス基本機能のテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createEventBus } from './event-bus';

interface TestEventMap {
  'test:event1': { message: string };
  'test:event2': { count: number };
  'test:error': { error: Error };
}

describe('EventBus', () => {
  let eventBus: ReturnType<typeof createEventBus<TestEventMap>>;

  beforeEach(() => {
    eventBus = createEventBus<TestEventMap>();
    vi.clearAllMocks();
  });

  describe('基本機能', () => {
    it('should emit and receive events', () => {
      const handler = vi.fn();
      
      eventBus.subscribe('test:event1', handler);
      eventBus.emit('test:event1', { message: 'Hello World' });
      
      expect(handler).toHaveBeenCalledWith({ message: 'Hello World' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should support multiple handlers for same event', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      
      eventBus.subscribe('test:event1', handler1);
      eventBus.subscribe('test:event1', handler2);
      eventBus.emit('test:event1', { message: 'Test' });
      
      expect(handler1).toHaveBeenCalledWith({ message: 'Test' });
      expect(handler2).toHaveBeenCalledWith({ message: 'Test' });
    });

    it('should return unsubscribe function', () => {
      const handler = vi.fn();
      
      const unsubscribe = eventBus.subscribe('test:event1', handler);
      eventBus.emit('test:event1', { message: 'Before' });
      
      unsubscribe();
      eventBus.emit('test:event1', { message: 'After' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ message: 'Before' });
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle handler errors gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const workingHandler = vi.fn();
      const errorHandler = vi.fn(() => {
        throw new Error('Handler error');
      });
      
      eventBus.subscribe('test:event1', errorHandler);
      eventBus.subscribe('test:event1', workingHandler);
      
      eventBus.emit('test:event1', { message: 'Test' });
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(workingHandler).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('リスナー管理', () => {
    it('should track listener count', () => {
      expect(eventBus.getListenerCount('test:event1')).toBe(0);
      
      const unsubscribe1 = eventBus.subscribe('test:event1', vi.fn());
      expect(eventBus.getListenerCount('test:event1')).toBe(1);
      
      const unsubscribe2 = eventBus.subscribe('test:event1', vi.fn());
      expect(eventBus.getListenerCount('test:event1')).toBe(2);
      
      unsubscribe1();
      expect(eventBus.getListenerCount('test:event1')).toBe(1);
      
      unsubscribe2();
      expect(eventBus.getListenerCount('test:event1')).toBe(0);
    });

    it('should warn when too many listeners', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // 100個のリスナーを登録
      for (let i = 0; i < 100; i++) {
        eventBus.subscribe('test:event1', vi.fn());
      }
      
      // 101個目で警告
      eventBus.subscribe('test:event1', vi.fn());
      
      expect(consoleWarnSpy).toHaveBeenCalled();
      consoleWarnSpy.mockRestore();
    });

    it('should clear all listeners', () => {
      eventBus.subscribe('test:event1', vi.fn());
      eventBus.subscribe('test:event2', vi.fn());
      
      expect(eventBus.getListenerCount('test:event1')).toBe(1);
      expect(eventBus.getListenerCount('test:event2')).toBe(1);
      
      eventBus.clear();
      
      expect(eventBus.getListenerCount('test:event1')).toBe(0);
      expect(eventBus.getListenerCount('test:event2')).toBe(0);
    });
  });

  describe('型安全性', () => {
    it('should be type-safe for event names and payloads', () => {
      const handler = vi.fn();
      
      // 正しい型のイベント
      eventBus.subscribe('test:event1', handler);
      eventBus.emit('test:event1', { message: 'Valid' });
      
      // TypeScriptコンパイル時にエラーとなるべき（実行時テストでは確認不可）
      // eventBus.emit('test:event1', { invalidField: 'error' });
      // eventBus.emit('invalid:event', { message: 'error' });
      
      expect(handler).toHaveBeenCalledWith({ message: 'Valid' });
    });
  });
});