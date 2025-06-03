/**
 * ResourceManager
 * 
 * 統一されたリソース管理とメモリリーク防止
 * 全設定コンポーネントで使用する共通リソース管理機能
 */

import type { 
  DisposableResource, 
  EventListenerEntry 
} from './BaseTypes';

/**
 * リソース管理クラス
 */
export class ResourceManager {
  private resources: DisposableResource[] = [];
  private eventListeners: EventListenerEntry[] = [];
  private timers: (NodeJS.Timeout | number)[] = [];
  private intervals: (NodeJS.Timeout | number)[] = [];
  private animationFrames: number[] = [];
  private observers: (MutationObserver | ResizeObserver | IntersectionObserver)[] = [];
  private abortControllers: AbortController[] = [];
  private isDisposed = false;

  /**
   * 解放可能リソースを追跡
   */
  track<T extends DisposableResource>(resource: T): T {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerにリソースを追加しようとしました');
      return resource;
    }
    
    this.resources.push(resource);
    console.log(`[ResourceManager] リソース追跡開始: ${resource.constructor.name}`);
    return resource;
  }

  /**
   * イベントリスナーを追跡
   */
  trackEventListener(entry: EventListenerEntry): void {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerにイベントリスナーを追加しようとしました');
      return;
    }
    
    this.eventListeners.push(entry);
    console.log(`[ResourceManager] イベントリスナー追跡: ${entry.type} on ${entry.element.tagName}`);
  }

  /**
   * タイマーを追跡
   */
  trackTimer(timer: NodeJS.Timeout | number): void {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerにタイマーを追加しようとしました');
      return;
    }
    
    this.timers.push(timer);
    console.log(`[ResourceManager] タイマー追跡: ${timer}`);
  }

  /**
   * インターバルを追跡
   */
  trackInterval(interval: NodeJS.Timeout | number): void {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerにインターバルを追加しようとしました');
      return;
    }
    
    this.intervals.push(interval);
    console.log(`[ResourceManager] インターバル追跡: ${interval}`);
  }

  /**
   * アニメーションフレームを追跡
   */
  trackAnimationFrame(frameId: number): void {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerにアニメーションフレームを追加しようとしました');
      return;
    }
    
    this.animationFrames.push(frameId);
    console.log(`[ResourceManager] アニメーションフレーム追跡: ${frameId}`);
  }

  /**
   * オブザーバーを追跡
   */
  trackObserver(observer: MutationObserver | ResizeObserver | IntersectionObserver): void {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerにオブザーバーを追加しようとしました');
      return;
    }
    
    this.observers.push(observer);
    console.log(`[ResourceManager] オブザーバー追跡: ${observer.constructor.name}`);
  }

  /**
   * AbortControllerを追跡
   */
  trackAbortController(controller: AbortController): void {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerにAbortControllerを追加しようとしました');
      return;
    }
    
    this.abortControllers.push(controller);
    console.log(`[ResourceManager] AbortController追跡`);
  }

  /**
   * WeakMapベースのオブジェクト関連付け
   */
  private objectAssociations = new WeakMap<object, DisposableResource[]>();

  /**
   * オブジェクトにリソースを関連付け
   */
  associateResource<T extends object>(obj: T, resource: DisposableResource): void {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerにオブジェクト関連付けを追加しようとしました');
      return;
    }
    
    const existing = this.objectAssociations.get(obj) || [];
    existing.push(resource);
    this.objectAssociations.set(obj, existing);
    
    console.log(`[ResourceManager] オブジェクト関連付け: ${obj.constructor.name} → ${resource.constructor.name}`);
  }

  /**
   * オブジェクトに関連付けられたリソースを解放
   */
  cleanupObjectResources<T extends object>(obj: T): void {
    const resources = this.objectAssociations.get(obj);
    if (!resources) return;

    resources.forEach(resource => {
      try {
        resource.dispose();
        console.log(`[ResourceManager] オブジェクト関連リソース解放: ${resource.constructor.name}`);
      } catch (error) {
        console.error('[ResourceManager] オブジェクト関連リソース解放エラー:', error);
      }
    });

    this.objectAssociations.delete(obj);
  }

  /**
   * 安全なイベントリスナー追加
   */
  safeAddEventListener<K extends keyof HTMLElementEventMap>(
    element: HTMLElement,
    type: K,
    listener: (ev: HTMLElementEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions
  ): void {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerでイベントリスナーを追加しようとしました');
      return;
    }

    try {
      element.addEventListener(type, listener, options);
      this.trackEventListener({ element, type, listener: listener as EventListener });
    } catch (error) {
      console.error('[ResourceManager] イベントリスナー追加エラー:', error);
    }
  }

  /**
   * 安全なタイマー作成
   */
  safeSetTimeout(callback: () => void, delay: number): NodeJS.Timeout | number {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerでタイマーを作成しようとしました');
      return 0;
    }

    const timer = setTimeout(() => {
      try {
        callback();
      } catch (error) {
        console.error('[ResourceManager] タイマーコールバックエラー:', error);
      }
      // タイマー完了後、追跡リストから除去
      this.timers = this.timers.filter(t => t !== timer);
    }, delay);

    this.trackTimer(timer);
    return timer;
  }

  /**
   * 安全なインターバル作成
   */
  safeSetInterval(callback: () => void, delay: number): NodeJS.Timeout | number {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerでインターバルを作成しようとしました');
      return 0;
    }

    const interval = setInterval(() => {
      try {
        callback();
      } catch (error) {
        console.error('[ResourceManager] インターバルコールバックエラー:', error);
      }
    }, delay);

    this.trackInterval(interval);
    return interval;
  }

  /**
   * 安全なアニメーションフレーム要求
   */
  safeRequestAnimationFrame(callback: FrameRequestCallback): number {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みのManagerでアニメーションフレームを要求しようとしました');
      return 0;
    }

    const frameId = requestAnimationFrame((timestamp) => {
      try {
        callback(timestamp);
      } catch (error) {
        console.error('[ResourceManager] アニメーションフレームコールバックエラー:', error);
      }
      // フレーム完了後、追跡リストから除去
      this.animationFrames = this.animationFrames.filter(id => id !== frameId);
    });

    this.trackAnimationFrame(frameId);
    return frameId;
  }

  /**
   * リソース使用状況を取得
   */
  getResourceStatus(): {
    resources: number;
    eventListeners: number;
    timers: number;
    intervals: number;
    animationFrames: number;
    observers: number;
    abortControllers: number;
    isDisposed: boolean;
  } {
    return {
      resources: this.resources.length,
      eventListeners: this.eventListeners.length,
      timers: this.timers.length,
      intervals: this.intervals.length,
      animationFrames: this.animationFrames.length,
      observers: this.observers.length,
      abortControllers: this.abortControllers.length,
      isDisposed: this.isDisposed
    };
  }

  /**
   * 特定タイプのリソースをクリーンアップ
   */
  cleanupResourceType(type: 'timers' | 'intervals' | 'animationFrames' | 'observers' | 'eventListeners' | 'abortControllers'): void {
    switch (type) {
      case 'timers':
        this.timers.forEach(timer => clearTimeout(timer));
        this.timers = [];
        break;
      
      case 'intervals':
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        break;
      
      case 'animationFrames':
        this.animationFrames.forEach(frameId => cancelAnimationFrame(frameId));
        this.animationFrames = [];
        break;
      
      case 'observers':
        this.observers.forEach(observer => observer.disconnect());
        this.observers = [];
        break;
      
      case 'eventListeners':
        this.eventListeners.forEach(({ element, type, listener }) => {
          try {
            element.removeEventListener(type, listener);
          } catch (error) {
            console.warn('[ResourceManager] イベントリスナー削除エラー:', error);
          }
        });
        this.eventListeners = [];
        break;
      
      case 'abortControllers':
        this.abortControllers.forEach(controller => {
          if (!controller.signal.aborted) {
            controller.abort();
          }
        });
        this.abortControllers = [];
        break;
    }
    
    console.log(`[ResourceManager] ${type} クリーンアップ完了`);
  }

  /**
   * すべてのリソースをクリーンアップ
   */
  cleanup(): void {
    if (this.isDisposed) {
      console.warn('[ResourceManager] 既に解放済みです');
      return;
    }

    console.log('[ResourceManager] 全リソースクリーンアップ開始');
    const startTime = performance.now();

    // 追跡リソースの解放
    this.resources.forEach(resource => {
      try {
        resource.dispose();
      } catch (error) {
        console.error('[ResourceManager] リソース解放エラー:', error);
      }
    });

    // 各タイプのリソースをクリーンアップ
    this.cleanupResourceType('timers');
    this.cleanupResourceType('intervals');
    this.cleanupResourceType('animationFrames');
    this.cleanupResourceType('observers');
    this.cleanupResourceType('eventListeners');
    this.cleanupResourceType('abortControllers');

    // 配列をクリア
    this.resources = [];
    
    this.isDisposed = true;
    
    const duration = performance.now() - startTime;
    console.log(`[ResourceManager] 全リソースクリーンアップ完了: ${duration.toFixed(2)}ms`);
  }

  /**
   * メモリリーク検出
   */
  detectMemoryLeaks(): {
    suspiciousResources: string[];
    recommendations: string[];
  } {
    const status = this.getResourceStatus();
    const suspicious: string[] = [];
    const recommendations: string[] = [];

    // しきい値チェック
    if (status.eventListeners > 50) {
      suspicious.push(`過多なイベントリスナー: ${status.eventListeners}個`);
      recommendations.push('不要なイベントリスナーを削除してください');
    }

    if (status.timers > 20) {
      suspicious.push(`過多なタイマー: ${status.timers}個`);
      recommendations.push('未使用のタイマーをクリアしてください');
    }

    if (status.intervals > 10) {
      suspicious.push(`過多なインターバル: ${status.intervals}個`);
      recommendations.push('不要なインターバルをクリアしてください');
    }

    if (status.animationFrames > 30) {
      suspicious.push(`過多なアニメーションフレーム: ${status.animationFrames}個`);
      recommendations.push('アニメーションフレームの管理を見直してください');
    }

    return { suspiciousResources: suspicious, recommendations };
  }
}

export default ResourceManager;