/**
 * Event Bus - FSD Phase 1.1 Complete Implementation
 * 型安全なイベント駆動システムの完全実装
 */

type EventMap = Record<string, any>;

interface EventHandler<T = any> {
  handler: (payload: T) => void | Promise<void>;
  priority?: number;
  once?: boolean;
}

interface EventBusOptions {
  maxListeners?: number;
  enableHistory?: boolean;
  historySize?: number;
  errorHandler?: (error: Error, event: string, payload: any) => void;
}

interface EventHistoryEntry<T extends EventMap, K extends keyof T = keyof T> {
  event: K;
  payload: T[K];
  timestamp: number;
  handlerCount: number;
}

interface EventBus<T extends EventMap> {
  emit<K extends keyof T>(event: K, payload: T[K]): void;
  emitAsync<K extends keyof T>(event: K, payload: T[K]): Promise<void>;
  subscribe<K extends keyof T>(
    event: K, 
    handler: (payload: T[K]) => void | Promise<void>,
    options?: { priority?: number; once?: boolean }
  ): () => void;
  subscribeOnce<K extends keyof T>(
    event: K,
    handler: (payload: T[K]) => void | Promise<void>
  ): () => void;
  unsubscribe<K extends keyof T>(event: K, handler: Function): void;
  unsubscribeAll<K extends keyof T>(event?: K): void;
  clear(): void;
  getListenerCount<K extends keyof T>(event: K): number;
  getHistory(): EventHistoryEntry<T>[];
  clearHistory(): void;
  waitFor<K extends keyof T>(event: K, timeout?: number): Promise<T[K]>;
}

export const createEventBus = <T extends EventMap>(options: EventBusOptions = {}): EventBus<T> => {
  const {
    maxListeners = 100,
    enableHistory = process.env.NODE_ENV === 'development',
    historySize = 100,
    errorHandler = (error, event) => {
      console.error(`EventBus: Error in handler for ${event}:`, error);
    }
  } = options;

  const events = new Map<keyof T, Set<EventHandler>>();
  const history: EventHistoryEntry<T>[] = [];
  const waitingPromises = new Map<keyof T, Array<{ resolve: Function; reject: Function; timeout?: NodeJS.Timeout }>>();

  const addToHistory = <K extends keyof T>(event: K, payload: T[K], handlerCount: number) => {
    if (!enableHistory) return;
    
    history.push({
      event,
      payload,
      timestamp: Date.now(),
      handlerCount
    });

    if (history.length > historySize) {
      history.shift();
    }
  };

  const sortHandlersByPriority = (handlers: Set<EventHandler>): EventHandler[] => {
    return Array.from(handlers).sort((a, b) => (b.priority || 0) - (a.priority || 0));
  };

  const resolveWaitingPromises = <K extends keyof T>(event: K, payload: T[K]) => {
    const waiting = waitingPromises.get(event);
    if (waiting) {
      waiting.forEach(({ resolve, timeout }) => {
        if (timeout) clearTimeout(timeout);
        resolve(payload);
      });
      waitingPromises.delete(event);
    }
  };

  return {
    emit(event, payload) {
      const handlers = events.get(event);
      
      const handlerCount = handlers?.size || 0;
      
      if (handlers && handlers.size > 0) {
        const sortedHandlers = sortHandlersByPriority(handlers);
        const handlersToRemove: EventHandler[] = [];

        sortedHandlers.forEach((eventHandler) => {
          try {
            eventHandler.handler(payload);
            if (eventHandler.once) {
              handlersToRemove.push(eventHandler);
            }
          } catch (error) {
            errorHandler(error as Error, String(event), payload);
          }
        });

        // Remove once handlers
        handlersToRemove.forEach(h => {
          handlers.delete(h);
        });
      }
      
      // 履歴は常に記録（ハンドラーがなくても）
      addToHistory(event, payload, handlerCount);

      // Resolve any waiting promises
      resolveWaitingPromises(event, payload);
      
      // デバッグログ（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        console.log(`EventBus: ${String(event)}`, payload);
      }
    },

    async emitAsync(event, payload) {
      const handlers = events.get(event);
      const handlerCount = handlers?.size || 0;
      
      if (handlers && handlers.size > 0) {
        const sortedHandlers = sortHandlersByPriority(handlers);
        const handlersToRemove: EventHandler[] = [];

        for (const eventHandler of sortedHandlers) {
          try {
            await eventHandler.handler(payload);
            if (eventHandler.once) {
              handlersToRemove.push(eventHandler);
            }
          } catch (error) {
            errorHandler(error as Error, String(event), payload);
          }
        }

        // Remove once handlers
        handlersToRemove.forEach(h => {
          handlers.delete(h);
        });
      }
      
      // 履歴は常に記録（ハンドラーがなくても）
      addToHistory(event, payload, handlerCount);

      // Resolve any waiting promises
      resolveWaitingPromises(event, payload);
    },
    
    subscribe(event, handler, options = {}) {
      if (!events.has(event)) {
        events.set(event, new Set());
      }
      
      const handlers = events.get(event)!;
      
      if (handlers.size >= maxListeners) {
        console.warn(`EventBus: Too many listeners for ${String(event)}`);
      }
      
      const eventHandler: EventHandler = {
        handler,
        priority: options.priority,
        once: options.once
      };

      handlers.add(eventHandler);
      
      return () => {
        handlers.delete(eventHandler);
        if (handlers.size === 0) {
          events.delete(event);
        }
      };
    },

    subscribeOnce(event, handler) {
      return this.subscribe(event, handler, { once: true });
    },
    
    unsubscribe(event, handler) {
      const handlers = events.get(event);
      if (handlers) {
        const toRemove = Array.from(handlers).find(h => h.handler === handler);
        if (toRemove) {
          handlers.delete(toRemove);
          if (handlers.size === 0) {
            events.delete(event);
          }
        }
      }
    },

    unsubscribeAll(event?) {
      if (event) {
        events.delete(event);
      } else {
        events.clear();
      }
    },

    clear() {
      events.clear();
      history.length = 0;
      waitingPromises.clear();
    },
    
    getListenerCount(event) {
      return events.get(event)?.size ?? 0;
    },

    getHistory() {
      return [...history];
    },

    clearHistory() {
      history.length = 0;
    },

    async waitFor(event, timeout = 30000) {
      return new Promise<T[typeof event]>((resolve, reject) => {
        const timeoutId = timeout > 0 ? setTimeout(() => {
          const waiting = waitingPromises.get(event);
          if (waiting) {
            const index = waiting.findIndex(w => w.resolve === resolve);
            if (index !== -1) {
              waiting.splice(index, 1);
              if (waiting.length === 0) {
                waitingPromises.delete(event);
              }
            }
          }
          reject(new Error(`Timeout waiting for event: ${String(event)}`));
        }, timeout) : undefined;

        if (!waitingPromises.has(event)) {
          waitingPromises.set(event, []);
        }

        waitingPromises.get(event)!.push({ resolve, reject, timeout: timeoutId });
      });
    }
  };
};