/**
 * Event Bus Complete Tests - FSD Phase 1.1
 * イベントバス完全機能のテスト
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createEventBus } from '../event-bus';

interface TestEventMap {
  'test:event1': { message: string };
  'test:event2': { count: number };
  'test:error': { error: Error };
  'test:async': { data: string };
  'test:priority': { order: number };
}

describe('EventBus Complete Implementation', () => {
  let eventBus: ReturnType<typeof createEventBus<TestEventMap>>;

  beforeEach(() => {
    vi.useFakeTimers();
    eventBus = createEventBus<TestEventMap>({
      enableHistory: true,
      historySize: 10
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('新機能：subscribeOnce', () => {
    it('should trigger handler only once', () => {
      const handler = vi.fn();
      
      eventBus.subscribeOnce('test:event1', handler);
      
      eventBus.emit('test:event1', { message: 'First' });
      eventBus.emit('test:event1', { message: 'Second' });
      
      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith({ message: 'First' });
    });

    it('should work with regular subscribe', () => {
      const onceHandler = vi.fn();
      const regularHandler = vi.fn();
      
      eventBus.subscribeOnce('test:event1', onceHandler);
      eventBus.subscribe('test:event1', regularHandler);
      
      eventBus.emit('test:event1', { message: 'Test' });
      eventBus.emit('test:event1', { message: 'Test2' });
      
      expect(onceHandler).toHaveBeenCalledTimes(1);
      expect(regularHandler).toHaveBeenCalledTimes(2);
    });
  });

  describe('新機能：優先度付きハンドラー', () => {
    it('should execute handlers in priority order', () => {
      const order: number[] = [];
      
      eventBus.subscribe('test:priority', () => order.push(3), { priority: 1 });
      eventBus.subscribe('test:priority', () => order.push(1), { priority: 10 });
      eventBus.subscribe('test:priority', () => order.push(2), { priority: 5 });
      eventBus.subscribe('test:priority', () => order.push(4)); // デフォルト優先度は0
      
      eventBus.emit('test:priority', { order: 0 });
      
      expect(order).toEqual([1, 2, 3, 4]);
    });
  });

  describe('新機能：非同期ハンドラーサポート', () => {
    it('should handle async handlers with emitAsync', async () => {
      const order: string[] = [];
      
      eventBus.subscribe('test:async', async (payload) => {
        await new Promise(resolve => {
          setTimeout(() => resolve(undefined), 10);
          vi.advanceTimersByTime(10);
        });
        order.push(`async1: ${payload.data}`);
      });
      
      eventBus.subscribe('test:async', async (payload) => {
        await new Promise(resolve => {
          setTimeout(() => resolve(undefined), 5);
          vi.advanceTimersByTime(5);
        });
        order.push(`async2: ${payload.data}`);
      });
      
      await eventBus.emitAsync('test:async', { data: 'test' });
      
      expect(order).toEqual(['async1: test', 'async2: test']);
    });

    it('should handle errors in async handlers', async () => {
      const errorHandler = vi.fn();
      const eventBus = createEventBus<TestEventMap>({
        errorHandler
      });
      
      eventBus.subscribe('test:async', async () => {
        throw new Error('Async error');
      });
      
      await eventBus.emitAsync('test:async', { data: 'test' });
      
      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        'test:async',
        { data: 'test' }
      );
    });
  });

  describe('新機能：イベント履歴', () => {
    it('should record event history', () => {
      eventBus.subscribe('test:event1', vi.fn());
      eventBus.subscribe('test:event2', vi.fn());
      
      eventBus.emit('test:event1', { message: 'Hello' });
      eventBus.emit('test:event2', { count: 42 });
      
      const history = eventBus.getHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0]).toMatchObject({
        event: 'test:event1',
        payload: { message: 'Hello' },
        handlerCount: 1
      });
      expect(history[1]).toMatchObject({
        event: 'test:event2',
        payload: { count: 42 },
        handlerCount: 1
      });
    });

    it('should limit history size', () => {
      const smallBus = createEventBus<TestEventMap>({
        enableHistory: true,
        historySize: 3
      });
      
      for (let i = 0; i < 5; i++) {
        smallBus.emit('test:event2', { count: i });
      }
      
      const history = smallBus.getHistory();
      expect(history).toHaveLength(3);
      expect(history[0].payload.count).toBe(2); // 最初の2つは削除された
    });

    it('should clear history', () => {
      eventBus.emit('test:event1', { message: 'Test' });
      expect(eventBus.getHistory()).toHaveLength(1);
      
      eventBus.clearHistory();
      expect(eventBus.getHistory()).toHaveLength(0);
    });
  });

  describe('新機能：waitFor', () => {
    it('should wait for event', async () => {
      const promise = eventBus.waitFor('test:event1');
      
      setTimeout(() => {
        eventBus.emit('test:event1', { message: 'Awaited' });
      }, 100);
      
      vi.advanceTimersByTime(100);
      
      const result = await promise;
      expect(result).toEqual({ message: 'Awaited' });
    });

    it('should timeout if event not emitted', async () => {
      const promise = eventBus.waitFor('test:event1', 100);
      
      vi.advanceTimersByTime(150);
      
      await expect(promise).rejects.toThrow('Timeout waiting for event: test:event1');
    });

    it('should handle multiple waiters', async () => {
      const promise1 = eventBus.waitFor('test:event1');
      const promise2 = eventBus.waitFor('test:event1');
      
      eventBus.emit('test:event1', { message: 'Multiple' });
      
      const [result1, result2] = await Promise.all([promise1, promise2]);
      
      expect(result1).toEqual({ message: 'Multiple' });
      expect(result2).toEqual({ message: 'Multiple' });
    });
  });

  describe('新機能：unsubscribeAll', () => {
    it('should unsubscribe all handlers for specific event', () => {
      eventBus.subscribe('test:event1', vi.fn());
      eventBus.subscribe('test:event1', vi.fn());
      eventBus.subscribe('test:event2', vi.fn());
      
      expect(eventBus.getListenerCount('test:event1')).toBe(2);
      expect(eventBus.getListenerCount('test:event2')).toBe(1);
      
      eventBus.unsubscribeAll('test:event1');
      
      expect(eventBus.getListenerCount('test:event1')).toBe(0);
      expect(eventBus.getListenerCount('test:event2')).toBe(1);
    });

    it('should unsubscribe all handlers when no event specified', () => {
      eventBus.subscribe('test:event1', vi.fn());
      eventBus.subscribe('test:event2', vi.fn());
      
      eventBus.unsubscribeAll();
      
      expect(eventBus.getListenerCount('test:event1')).toBe(0);
      expect(eventBus.getListenerCount('test:event2')).toBe(0);
    });
  });

  describe('エラーハンドリング拡張', () => {
    it('should use custom error handler', () => {
      const customErrorHandler = vi.fn();
      const customBus = createEventBus<TestEventMap>({
        errorHandler: customErrorHandler
      });
      
      customBus.subscribe('test:error', () => {
        throw new Error('Custom error');
      });
      
      customBus.emit('test:error', { error: new Error('Test') });
      
      expect(customErrorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        'test:error',
        { error: expect.any(Error) }
      );
    });
  });

  describe('パフォーマンステスト', () => {
    it('should handle high volume of events efficiently', () => {
      const handler = vi.fn();
      const eventCount = 10000;
      
      eventBus.subscribe('test:event1', handler);
      
      const start = performance.now();
      
      for (let i = 0; i < eventCount; i++) {
        eventBus.emit('test:event1', { message: `Event ${i}` });
      }
      
      const duration = performance.now() - start;
      
      expect(handler).toHaveBeenCalledTimes(eventCount);
      expect(duration).toBeLessThan(100); // 10,000イベントが100ms以内
    });

    it('should handle many subscribers efficiently', () => {
      const subscriberCount = 100;
      const handlers: any[] = [];
      
      for (let i = 0; i < subscriberCount; i++) {
        const handler = vi.fn();
        handlers.push(handler);
        eventBus.subscribe('test:event1', handler);
      }
      
      const start = performance.now();
      eventBus.emit('test:event1', { message: 'Broadcast' });
      const duration = performance.now() - start;
      
      handlers.forEach(handler => {
        expect(handler).toHaveBeenCalledWith({ message: 'Broadcast' });
      });
      
      expect(duration).toBeLessThan(10); // 100ハンドラーへの配信が10ms以内
    });
  });

  describe('メモリリーク防止', () => {
    it('should not leak memory with subscribeOnce', () => {
      const initialCount = eventBus.getListenerCount('test:event1');
      
      for (let i = 0; i < 100; i++) {
        eventBus.subscribeOnce('test:event1', vi.fn());
      }
      
      expect(eventBus.getListenerCount('test:event1')).toBe(initialCount + 100);
      
      eventBus.emit('test:event1', { message: 'Clear once' });
      
      expect(eventBus.getListenerCount('test:event1')).toBe(initialCount);
    });

    it('should clean up waiting promises', async () => {
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < 10; i++) {
        promises.push(eventBus.waitFor('test:event1', 50));
      }
      
      vi.advanceTimersByTime(100);
      
      // すべてのプロミスがタイムアウトでリジェクトされる
      const results = await Promise.allSettled(promises);
      results.forEach(result => {
        expect(result.status).toBe('rejected');
      });
      
      // 内部的にクリーンアップされていることを確認
      eventBus.emit('test:event1', { message: 'After timeout' });
      // タイムアウト後のイベントは待機中のプロミスに影響しない
    });
  });
});