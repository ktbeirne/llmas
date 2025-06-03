/**
 * VRM Optimized Loader
 * TDD実装: VRMモデルの最適化されたローディングシステム
 */

import { dynamicLoader } from './dynamicLoader';

export interface VRMLoadingOptions {
  priority?: 'critical' | 'high' | 'normal' | 'low';
  enableCache?: boolean;
  quality?: 'high' | 'medium' | 'low';
  enableProgressive?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

export interface VRMLoadingProgress {
  stage: 'downloading' | 'parsing' | 'optimizing' | 'complete';
  progress: number; // 0-100
  estimatedTimeRemaining?: number;
  currentOperation?: string;
}

export interface DeviceCapabilities {
  memoryGB: number;
  cpuCores: number;
  isLowPowerMode: boolean;
  connectionType: 'wifi' | '4g' | '3g' | 'slow';
  batteryLevel: 'high' | 'medium' | 'low';
}

export interface VRMCacheEntry {
  data: any;
  url: string;
  size: number;
  lastAccessed: number;
  accessCount: number;
  priority: string;
  persistent: boolean;
}

export class VRMOptimizedLoader {
  private cache = new Map<string, VRMCacheEntry>();
  private loadingQueue: Array<{ url: string; options: VRMLoadingOptions; resolve: Function; reject: Function }> = [];
  private activeLoads = new Set<string>();
  private maxCacheSize = 50 * 1024 * 1024; // 50MB
  private maxConcurrentLoads = 2;
  private deviceCapabilities: DeviceCapabilities | null = null;
  private progressCallbacks = new Map<string, (progress: VRMLoadingProgress) => void>();
  
  /**
   * デバイス性能の設定
   */
  setDeviceCapabilities(capabilities: DeviceCapabilities): void {
    this.deviceCapabilities = capabilities;
    this.updateOptimizationStrategy();
  }
  
  /**
   * VRMモデルの遅延読み込み
   */
  async loadVRMLazy(
    url: string, 
    options: VRMLoadingOptions = {}
  ): Promise<any> {
    const {
      priority = 'normal',
      enableCache = true,
      quality = 'high',
      enableProgressive = true,
      timeout = 30000,
      retryAttempts = 3
    } = options;
    
    // キャッシュから確認
    if (enableCache && this.isCached(url)) {
      const cached = this.getFromCache(url);
      if (cached) {
        console.log(`✅ [VRMOptimizedLoader] Loaded from cache: ${url}`);
        return cached;
      }
    }
    
    // ローディングキューに追加
    return new Promise((resolve, reject) => {
      this.loadingQueue.push({
        url,
        options: { priority, enableCache, quality, enableProgressive, timeout, retryAttempts },
        resolve,
        reject
      });
      
      this.processLoadingQueue();
    });
  }
  
  /**
   * インテリジェントプリロード
   */
  async preloadIntelligent(
    urls: string[],
    userContext: {
      previouslyUsedModels?: string[];
      currentSceneType?: string;
      userPreferences?: any;
    } = {}
  ): Promise<void> {
    if (!this.deviceCapabilities) {
      console.warn('[VRMOptimizedLoader] Device capabilities not set, using default strategy');
      return;
    }
    
    const { memoryGB, batteryLevel, connectionType } = this.deviceCapabilities;
    
    // デバイス性能に基づく戦略決定
    const shouldPreload = 
      memoryGB >= 4 && 
      batteryLevel !== 'low' && 
      ['wifi', '4g'].includes(connectionType);
    
    if (!shouldPreload) {
      console.log('[VRMOptimizedLoader] Skipping preload due to device constraints');
      return;
    }
    
    // 優先度付きプリロード
    const prioritizedUrls = this.prioritizeUrls(urls, userContext);
    
    for (const url of prioritizedUrls.slice(0, 3)) { // 最大3つまで
      try {
        this.scheduleBackgroundLoad(url);
      } catch (error) {
        console.warn(`[VRMOptimizedLoader] Preload failed for ${url}:`, error);
      }
    }
  }
  
  /**
   * 段階的ローディング
   */
  async loadProgressive(
    url: string,
    onProgress?: (progress: VRMLoadingProgress) => void
  ): Promise<any> {
    if (onProgress) {
      this.progressCallbacks.set(url, onProgress);
    }
    
    try {
      // Stage 1: 基本構造のダウンロード
      this.notifyProgress(url, {
        stage: 'downloading',
        progress: 0,
        currentOperation: 'Downloading VRM file...'
      });
      
      await this.simulateDownload(url, 0.3); // 30%まで
      
      // Stage 2: パース処理
      this.notifyProgress(url, {
        stage: 'parsing',
        progress: 60,
        currentOperation: 'Parsing VRM structure...'
      });
      
      const vrmModules = await dynamicLoader.loadVRMModules();
      const vrm = await this.parseVRM(url, vrmModules);
      
      // Stage 3: 最適化
      this.notifyProgress(url, {
        stage: 'optimizing',
        progress: 90,
        currentOperation: 'Optimizing for performance...'
      });
      
      const optimizedVRM = await this.optimizeVRM(vrm);
      
      // Stage 4: 完了
      this.notifyProgress(url, {
        stage: 'complete',
        progress: 100,
        currentOperation: 'Ready!'
      });
      
      return optimizedVRM;
    } finally {
      this.progressCallbacks.delete(url);
    }
  }
  
  /**
   * リトライ機能付きロード
   */
  async loadWithRetry(
    url: string,
    options: VRMLoadingOptions = {}
  ): Promise<any> {
    const { retryAttempts = 3, timeout = 30000 } = options;
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < retryAttempts; attempt++) {
      try {
        // タイムアウト付きでロード
        const result = await Promise.race([
          this.actualLoad(url, options),
          this.createTimeoutPromise(timeout)
        ]);
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < retryAttempts - 1) {
          // 指数バックオフで待機
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.warn(`[VRMOptimizedLoader] Attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError || new Error(`Failed to load ${url} after ${retryAttempts} attempts`);
  }
  
  /**
   * キャッシュ管理
   */
  private isCached(url: string): boolean {
    return this.cache.has(url);
  }
  
  private getFromCache(url: string): any | null {
    const entry = this.cache.get(url);
    if (entry) {
      entry.lastAccessed = Date.now();
      entry.accessCount++;
      return entry.data;
    }
    return null;
  }
  
  private addToCache(url: string, data: any, options: VRMLoadingOptions): void {
    const size = this.estimateSize(data);
    
    // メモリ制限チェック
    this.enforceMemoryLimit(size);
    
    this.cache.set(url, {
      data,
      url,
      size,
      lastAccessed: Date.now(),
      accessCount: 1,
      priority: options.priority || 'normal',
      persistent: options.priority === 'critical'
    });
  }
  
  private enforceMemoryLimit(newSize: number): void {
    const currentSize = this.getCurrentCacheSize();
    
    if (currentSize + newSize > this.maxCacheSize) {
      // LRU削除（永続化されていないもの）
      const sortedEntries = Array.from(this.cache.entries())
        .filter(([, entry]) => !entry.persistent)
        .sort((a, b) => {
          // アクセス頻度と最終アクセス時間の組み合わせ
          const scoreA = a[1].accessCount / (Date.now() - a[1].lastAccessed);
          const scoreB = b[1].accessCount / (Date.now() - b[1].lastAccessed);
          return scoreA - scoreB;
        });
      
      let freedSize = 0;
      for (const [url, entry] of sortedEntries) {
        this.cache.delete(url);
        freedSize += entry.size;
        
        if (freedSize >= newSize) break;
      }
    }
  }
  
  /**
   * ローディングキューの処理
   */
  private async processLoadingQueue(): Promise<void> {
    if (this.activeLoads.size >= this.maxConcurrentLoads) {
      return; // 同時ロード数制限
    }
    
    // 優先度でソート
    this.loadingQueue.sort((a, b) => {
      const priorities = { critical: 4, high: 3, normal: 2, low: 1 };
      return priorities[b.options.priority!] - priorities[a.options.priority!];
    });
    
    const queueItem = this.loadingQueue.shift();
    if (!queueItem) return;
    
    const { url, options, resolve, reject } = queueItem;
    
    if (this.activeLoads.has(url)) {
      // 既に読み込み中
      this.loadingQueue.push(queueItem);
      return;
    }
    
    this.activeLoads.add(url);
    
    try {
      const result = await this.loadWithRetry(url, options);
      
      if (options.enableCache) {
        this.addToCache(url, result, options);
      }
      
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.activeLoads.delete(url);
      
      // 次のアイテムを処理
      setTimeout(() => this.processLoadingQueue(), 0);
    }
  }
  
  /**
   * 実際のロード処理
   */
  private async actualLoad(url: string, options: VRMLoadingOptions): Promise<any> {
    const quality = this.getAdaptiveQuality(options.quality || 'high');
    
    // VRMモジュールの動的読み込み
    const vrmModules = await dynamicLoader.loadVRMModules();
    
    // 実際のVRMファイル読み込み（簡略化）
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    
    // VRMパース
    const vrm = await this.parseVRMFromBuffer(arrayBuffer, vrmModules, quality);
    
    return vrm;
  }
  
  /**
   * 最適化戦略の更新
   */
  private updateOptimizationStrategy(): void {
    if (!this.deviceCapabilities) return;
    
    const { memoryGB, cpuCores, isLowPowerMode } = this.deviceCapabilities;
    
    // 高性能デバイス
    if (memoryGB >= 8 && cpuCores >= 4 && !isLowPowerMode) {
      this.maxConcurrentLoads = 4;
      this.maxCacheSize = 100 * 1024 * 1024; // 100MB
    }
    // 中性能デバイス
    else if (memoryGB >= 4 && cpuCores >= 2) {
      this.maxConcurrentLoads = 2;
      this.maxCacheSize = 50 * 1024 * 1024; // 50MB
    }
    // 低性能デバイス
    else {
      this.maxConcurrentLoads = 1;
      this.maxCacheSize = 25 * 1024 * 1024; // 25MB
    }
  }
  
  // ヘルパーメソッド
  
  private prioritizeUrls(urls: string[], userContext: any): string[] {
    const { previouslyUsedModels = [] } = userContext;
    
    return urls.sort((a, b) => {
      const aUsed = previouslyUsedModels.includes(a);
      const bUsed = previouslyUsedModels.includes(b);
      
      if (aUsed && !bUsed) return -1;
      if (!aUsed && bUsed) return 1;
      return 0;
    });
  }
  
  private async scheduleBackgroundLoad(url: string): Promise<void> {
    // requestIdleCallbackを使用した低優先度読み込み
    return new Promise((resolve) => {
      const load = async () => {
        try {
          await this.loadVRMLazy(url, { priority: 'low' });
          resolve();
        } catch (error) {
          console.warn(`Background load failed for ${url}:`, error);
          resolve(); // エラーでも続行
        }
      };
      
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(load, { timeout: 5000 });
      } else {
        setTimeout(load, 100);
      }
    });
  }
  
  private getAdaptiveQuality(requestedQuality: string): string {
    if (!this.deviceCapabilities) return requestedQuality;
    
    const { memoryGB, isLowPowerMode } = this.deviceCapabilities;
    
    if (isLowPowerMode || memoryGB < 4) {
      return 'medium'; // 品質を下げる
    }
    
    return requestedQuality;
  }
  
  private async simulateDownload(url: string, progressTarget: number): Promise<void> {
    for (let i = 0; i <= progressTarget * 100; i += 5) {
      this.notifyProgress(url, {
        stage: 'downloading',
        progress: i,
        currentOperation: `Downloading... ${i}%`
      });
      await new Promise(resolve => setTimeout(resolve, 20));
    }
  }
  
  private notifyProgress(url: string, progress: VRMLoadingProgress): void {
    const callback = this.progressCallbacks.get(url);
    if (callback) {
      callback(progress);
    }
  }
  
  private async parseVRM(url: string, vrmModules: any): Promise<any> {
    // 実際の実装では、VRMLoaderPluginを使用
    return { mockVRM: true, url };
  }
  
  private async optimizeVRM(vrm: any): Promise<any> {
    // テクスチャ圧縮、メッシュ最適化など
    return { ...vrm, optimized: true };
  }
  
  private async parseVRMFromBuffer(buffer: ArrayBuffer, vrmModules: any, quality: string): Promise<any> {
    // 簡略化された実装
    return { 
      buffer, 
      quality,
      size: buffer.byteLength,
      parsedAt: Date.now() 
    };
  }
  
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Load timeout')), timeout);
    });
  }
  
  private estimateSize(data: any): number {
    // 簡略化されたサイズ推定
    return JSON.stringify(data).length;
  }
  
  private getCurrentCacheSize(): number {
    let total = 0;
    this.cache.forEach(entry => total += entry.size);
    return total;
  }
  
  /**
   * 統計情報取得
   */
  getStats() {
    return {
      cacheSize: this.getCurrentCacheSize(),
      cachedModels: this.cache.size,
      activeLoads: this.activeLoads.size,
      queueLength: this.loadingQueue.length,
      maxCacheSize: this.maxCacheSize,
      maxConcurrentLoads: this.maxConcurrentLoads
    };
  }
  
  /**
   * クリーンアップ
   */
  cleanup(): void {
    this.cache.clear();
    this.loadingQueue = [];
    this.activeLoads.clear();
    this.progressCallbacks.clear();
  }
}

// シングルトンインスタンス
export const vrmOptimizedLoader = new VRMOptimizedLoader();

// 便利なヘルパー関数
export const loadVRMOptimized = (url: string, options?: VRMLoadingOptions) =>
  vrmOptimizedLoader.loadVRMLazy(url, options);

export const preloadVRMIntelligent = (urls: string[], userContext?: any) =>
  vrmOptimizedLoader.preloadIntelligent(urls, userContext);

export const loadVRMProgressive = (url: string, onProgress?: (progress: VRMLoadingProgress) => void) =>
  vrmOptimizedLoader.loadProgressive(url, onProgress);

// クリーンアップ関数
export const cleanupVRMLoader = () => vrmOptimizedLoader.cleanup();