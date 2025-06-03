/**
 * PerformanceManager
 * 
 * 全設定コンポーネント共通のパフォーマンス管理
 * 統一された監視、最適化、メモリ管理を提供
 */

import type { 
  PerformanceInfo, 
  MemoryInfo, 
  DOMUpdate, 
  VirtualListConfig 
} from './BaseTypes';

/**
 * パフォーマンス管理クラス
 */
export class PerformanceManager {
  private operations = new Map<string, number>();
  private performanceLog: PerformanceInfo[] = [];
  private readonly PERFORMANCE_THRESHOLD = 1000; // 1秒
  private readonly MAX_LOG_SIZE = 50;

  /**
   * 操作の開始を記録
   */
  start(operation: string): void {
    this.operations.set(operation, performance.now());
    console.log(`[Performance] ${operation} 開始`);
  }

  /**
   * 操作の終了を記録し、パフォーマンス情報を返す
   */
  end(operation: string): number {
    const startTime = this.operations.get(operation);
    if (!startTime) {
      console.warn(`[Performance] 開始時刻が見つかりません: ${operation}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    const info: PerformanceInfo = {
      operation,
      duration,
      timestamp: new Date(),
      memoryUsage: this.getMemoryUsage()
    };

    this.logPerformance(info);
    this.operations.delete(operation);

    console.log(`[Performance] ${operation} 完了: ${duration.toFixed(2)}ms`);

    if (duration > this.PERFORMANCE_THRESHOLD) {
      console.warn(`[Performance] 性能警告: ${operation} が${this.PERFORMANCE_THRESHOLD}ms超過`);
    }

    return duration;
  }

  /**
   * パフォーマンス情報をログに記録
   */
  private logPerformance(info: PerformanceInfo): void {
    this.performanceLog.push(info);
    if (this.performanceLog.length > this.MAX_LOG_SIZE) {
      this.performanceLog.shift();
    }
  }

  /**
   * パフォーマンスログを取得
   */
  getPerformanceLog(): PerformanceInfo[] {
    return [...this.performanceLog];
  }

  /**
   * パフォーマンスログをクリア
   */
  clearPerformanceLog(): void {
    this.performanceLog = [];
  }

  /**
   * メモリ使用量を取得
   */
  getMemoryUsage(): MemoryInfo | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }
    return undefined;
  }

  /**
   * メモリ使用量を監視
   */
  checkMemoryUsage(): void {
    const memory = this.getMemoryUsage();
    if (!memory) return;

    const usagePercent = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
    console.log(`[Performance] メモリ使用率: ${usagePercent.toFixed(1)}%`);

    if (usagePercent > 80) {
      console.warn('[Performance] メモリ使用率が高いです。ガベージコレクションを検討してください。');
    }
  }

  /**
   * DOM操作の最適化 - バッチ更新
   */
  static batchDOMUpdates(updates: DOMUpdate[]): void {
    console.log(`[Performance] DOM操作バッチ実行: ${updates.length}件`);
    
    // 優先度順にソート
    const sortedUpdates = updates.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // DocumentFragmentを使用してバッチ更新
    const fragment = document.createDocumentFragment();
    
    // レイアウトの再計算を最小化するため、読み取り操作を先に実行
    const readOperations = sortedUpdates.filter(update => 
      update.operation.toString().includes('get') || 
      update.operation.toString().includes('read')
    );
    
    const writeOperations = sortedUpdates.filter(update => 
      !readOperations.includes(update)
    );

    // 読み取り操作を先に実行
    readOperations.forEach(update => {
      try {
        update.operation();
      } catch (error) {
        console.error('[Performance] DOM読み取り操作エラー:', error);
      }
    });

    // 書き込み操作をバッチ実行
    writeOperations.forEach(update => {
      try {
        update.operation();
      } catch (error) {
        console.error('[Performance] DOM書き込み操作エラー:', error);
      }
    });
  }

  /**
   * 大量データ向け仮想化リスト
   */
  static createVirtualizedList(
    container: HTMLElement,
    items: any[],
    config: VirtualListConfig
  ): HTMLElement {
    const virtualContainer = document.createElement('div');
    virtualContainer.style.height = `${items.length * config.itemHeight}px`;
    virtualContainer.style.position = 'relative';
    virtualContainer.style.overflow = 'auto';

    const viewport = document.createElement('div');
    viewport.style.position = 'absolute';
    viewport.style.top = '0';
    viewport.style.left = '0';
    viewport.style.right = '0';

    let startIndex = 0;
    let endIndex = Math.min(
      items.length,
      Math.ceil(container.clientHeight / config.itemHeight) + config.bufferSize
    );

    const renderItems = () => {
      viewport.innerHTML = '';
      
      for (let i = startIndex; i < endIndex; i++) {
        if (i >= items.length) break;
        
        const item = config.renderItem(items[i], i);
        item.style.position = 'absolute';
        item.style.top = `${i * config.itemHeight}px`;
        item.style.height = `${config.itemHeight}px`;
        
        viewport.appendChild(item);
      }
    };

    const handleScroll = () => {
      const scrollTop = virtualContainer.scrollTop;
      const newStartIndex = Math.floor(scrollTop / config.itemHeight);
      const newEndIndex = Math.min(
        items.length,
        newStartIndex + Math.ceil(container.clientHeight / config.itemHeight) + config.bufferSize
      );

      if (newStartIndex !== startIndex || newEndIndex !== endIndex) {
        startIndex = newStartIndex;
        endIndex = newEndIndex;
        renderItems();
      }
    };

    virtualContainer.addEventListener('scroll', handleScroll);
    virtualContainer.appendChild(viewport);
    
    renderItems();
    
    return virtualContainer;
  }

  /**
   * デバウンス関数（高性能版）
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number,
    immediate = false
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout | null = null;
    let callImmediate = immediate;

    return (...args: Parameters<T>) => {
      const callNow = callImmediate && !timeoutId;

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        if (!callImmediate) {
          func(...args);
        }
      }, delay);

      if (callNow) {
        func(...args);
      }
    };
  }

  /**
   * スロットル関数（高性能版）
   */
  static throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle = false;
    let lastArgs: Parameters<T> | null = null;

    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        
        setTimeout(() => {
          inThrottle = false;
          if (lastArgs) {
            func(...lastArgs);
            lastArgs = null;
          }
        }, limit);
      } else {
        lastArgs = args;
      }
    };
  }

  /**
   * requestAnimationFrame を使用した最適化されたアニメーション実行
   */
  static animateOptimized(callback: (timestamp: number) => boolean): void {
    let isRunning = true;
    
    const animate = (timestamp: number) => {
      if (!isRunning) return;
      
      try {
        const shouldContinue = callback(timestamp);
        if (shouldContinue) {
          requestAnimationFrame(animate);
        } else {
          isRunning = false;
        }
      } catch (error) {
        console.error('[Performance] アニメーション実行エラー:', error);
        isRunning = false;
      }
    };
    
    requestAnimationFrame(animate);
  }

  /**
   * フレームレート測定
   */
  static measureFrameRate(duration: number = 5000): Promise<number> {
    return new Promise((resolve) => {
      let frameCount = 0;
      const startTime = performance.now();
      
      const countFrame = () => {
        frameCount++;
        const elapsed = performance.now() - startTime;
        
        if (elapsed < duration) {
          requestAnimationFrame(countFrame);
        } else {
          const fps = (frameCount / elapsed) * 1000;
          resolve(fps);
        }
      };
      
      requestAnimationFrame(countFrame);
    });
  }
}

export default PerformanceManager;