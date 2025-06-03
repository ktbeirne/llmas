/**
 * Three.js Dynamic Loader
 * TDD実装: Three.js モジュールの動的読み込み最適化
 */

import { dynamicLoader } from './dynamicLoader';

export interface ThreeJSModules {
  THREE: typeof import('three');
  VRM: typeof import('@pixiv/three-vrm');
  VRMAnimation: typeof import('@pixiv/three-vrm-animation');
}

export interface ThreeJSLoadingOptions {
  enableProgressTracking?: boolean;
  preloadVRM?: boolean;
  preloadAnimation?: boolean;
  enableCaching?: boolean;
}

export class ThreeJSModuleLoader {
  private loadingProgress = 0;
  private totalModules = 0;
  private progressCallbacks: Array<(progress: number) => void> = [];
  private isInitialized = false;
  
  /**
   * 基本Three.jsモジュールの読み込み（最優先）
   */
  async loadBasicThreeJS(): Promise<typeof import('three')> {
    console.log('🔄 [ThreeJSLoader] Loading basic Three.js...');
    const startTime = performance.now();
    
    try {
      const THREE = await dynamicLoader.loadThreeJS();
      const loadTime = performance.now() - startTime;
      
      console.log(`✅ [ThreeJSLoader] Basic Three.js loaded in ${loadTime.toFixed(2)}ms`);
      this.updateProgress(1, 1);
      
      return THREE;
    } catch (error) {
      console.error('❌ [ThreeJSLoader] Failed to load basic Three.js:', error);
      throw error;
    }
  }
  
  /**
   * VRM関連モジュールの読み込み（オンデマンド）
   */
  async loadVRMModules(): Promise<{
    VRM: typeof import('@pixiv/three-vrm');
    VRMAnimation: typeof import('@pixiv/three-vrm-animation');
  }> {
    console.log('🔄 [ThreeJSLoader] Loading VRM modules...');
    const startTime = performance.now();
    
    try {
      const [VRM, VRMAnimation] = await Promise.all([
        dynamicLoader.loadVRMModules(),
        dynamicLoader.loadVRMAnimationModules()
      ]);
      
      const loadTime = performance.now() - startTime;
      console.log(`✅ [ThreeJSLoader] VRM modules loaded in ${loadTime.toFixed(2)}ms`);
      
      return { VRM, VRMAnimation };
    } catch (error) {
      console.error('❌ [ThreeJSLoader] Failed to load VRM modules:', error);
      throw error;
    }
  }
  
  /**
   * 段階的読み込み: 基本 → VRM → アニメーション
   */
  async loadProgressively(options: ThreeJSLoadingOptions = {}): Promise<ThreeJSModules> {
    const {
      enableProgressTracking = true,
      preloadVRM = false,
      preloadAnimation = false
    } = options;
    
    this.totalModules = 1 + (preloadVRM ? 1 : 0) + (preloadAnimation ? 1 : 0);
    this.loadingProgress = 0;
    
    console.log('🚀 [ThreeJSLoader] Starting progressive loading...');
    
    // 段階1: 基本Three.js（必須）
    const THREE = await this.loadBasicThreeJS();
    this.updateProgress(1, this.totalModules);
    
    // 段階2: VRM関連（条件付き）
    let VRM: typeof import('@pixiv/three-vrm') | null = null;
    let VRMAnimation: typeof import('@pixiv/three-vrm-animation') | null = null;
    
    if (preloadVRM || preloadAnimation) {
      const vrmModules = await this.loadVRMModules();
      VRM = vrmModules.VRM;
      VRMAnimation = vrmModules.VRMAnimation;
      this.updateProgress(this.totalModules, this.totalModules);
    }
    
    return {
      THREE,
      VRM: VRM!,
      VRMAnimation: VRMAnimation!
    };
  }
  
  /**
   * 最適化されたバッチ読み込み
   */
  async loadOptimized(): Promise<ThreeJSModules> {
    console.log('⚡ [ThreeJSLoader] Starting optimized batch loading...');
    const startTime = performance.now();
    
    try {
      // 並列読み込みで最大パフォーマンス
      const [THREE, vrmModules] = await Promise.all([
        this.loadBasicThreeJS(),
        this.loadVRMModules()
      ]);
      
      const totalTime = performance.now() - startTime;
      console.log(`🎯 [ThreeJSLoader] Optimized loading completed in ${totalTime.toFixed(2)}ms`);
      
      return {
        THREE,
        VRM: vrmModules.VRM,
        VRMAnimation: vrmModules.VRMAnimation
      };
    } catch (error) {
      console.error('❌ [ThreeJSLoader] Optimized loading failed:', error);
      throw error;
    }
  }
  
  /**
   * 遅延読み込み戦略（必要時のみ）
   */
  async loadOnDemand(): Promise<{
    loadThreeJS: () => Promise<typeof import('three')>;
    loadVRM: () => Promise<typeof import('@pixiv/three-vrm')>;
    loadVRMAnimation: () => Promise<typeof import('@pixiv/three-vrm-animation')>;
  }> {
    return {
      loadThreeJS: () => this.loadBasicThreeJS(),
      loadVRM: () => dynamicLoader.loadVRMModules(),
      loadVRMAnimation: () => dynamicLoader.loadVRMAnimationModules()
    };
  }
  
  /**
   * インテリジェントプリローディング
   */
  async intelligentPreload(userContext: {
    isVRMFeatureUsed?: boolean;
    isAnimationNeeded?: boolean;
    availableBandwidth?: 'low' | 'medium' | 'high';
  }): Promise<void> {
    const { isVRMFeatureUsed, isAnimationNeeded, availableBandwidth = 'medium' } = userContext;
    
    console.log('🧠 [ThreeJSLoader] Starting intelligent preload...', userContext);
    
    // 帯域幅に応じた戦略
    if (availableBandwidth === 'low') {
      // 低帯域幅：基本のみ
      await this.preloadModule('three', () => dynamicLoader.loadThreeJS());
    } else if (availableBandwidth === 'medium') {
      // 中帯域幅：基本 + 使用予定のモジュール
      await this.preloadModule('three', () => dynamicLoader.loadThreeJS());
      
      if (isVRMFeatureUsed) {
        await this.preloadModule('vrm', () => dynamicLoader.loadVRMModules());
      }
    } else {
      // 高帯域幅：すべてプリロード
      await Promise.all([
        this.preloadModule('three', () => dynamicLoader.loadThreeJS()),
        this.preloadModule('vrm', () => dynamicLoader.loadVRMModules()),
        isAnimationNeeded ? this.preloadModule('vrm-animation', () => dynamicLoader.loadVRMAnimationModules()) : Promise.resolve()
      ]);
    }
  }
  
  /**
   * 読み込み進捗の監視
   */
  onProgress(callback: (progress: number) => void): void {
    this.progressCallbacks.push(callback);
  }
  
  /**
   * 進捗コールバックのクリア
   */
  clearProgressCallbacks(): void {
    this.progressCallbacks = [];
  }
  
  /**
   * 現在の読み込み状況
   */
  getLoadingStatus(): {
    isThreeJSLoaded: boolean;
    isVRMLoaded: boolean;
    isVRMAnimationLoaded: boolean;
    overallProgress: number;
  } {
    return {
      isThreeJSLoaded: dynamicLoader.isModuleLoaded('three'),
      isVRMLoaded: dynamicLoader.isModuleLoaded('@pixiv/three-vrm'),
      isVRMAnimationLoaded: dynamicLoader.isModuleLoaded('@pixiv/three-vrm-animation'),
      overallProgress: this.loadingProgress
    };
  }
  
  /**
   * メモリクリーンアップ
   */
  cleanup(): void {
    this.progressCallbacks = [];
    this.loadingProgress = 0;
    this.totalModules = 0;
    this.isInitialized = false;
  }
  
  // Private methods
  
  private updateProgress(current: number, total: number): void {
    this.loadingProgress = (current / total) * 100;
    
    this.progressCallbacks.forEach(callback => {
      try {
        callback(this.loadingProgress);
      } catch (error) {
        console.error('[ThreeJSLoader] Error in progress callback:', error);
      }
    });
  }
  
  private async preloadModule<T>(
    moduleName: string,
    loader: () => Promise<T>
  ): Promise<void> {
    try {
      // requestIdleCallback使用で低優先度実行
      return new Promise<void>((resolve) => {
        const executePreload = async () => {
          try {
            await loader();
            console.log(`📦 [ThreeJSLoader] Preloaded: ${moduleName}`);
            resolve();
          } catch (error) {
            console.warn(`⚠️ [ThreeJSLoader] Preload failed for ${moduleName}:`, error);
            resolve(); // エラーでも続行
          }
        };
        
        if ('requestIdleCallback' in window) {
          (window as any).requestIdleCallback(executePreload, { timeout: 3000 });
        } else {
          setTimeout(executePreload, 100);
        }
      });
    } catch (error) {
      console.warn(`⚠️ [ThreeJSLoader] Preload setup failed for ${moduleName}:`, error);
    }
  }
}

// シングルトンインスタンス
export const threeJSLoader = new ThreeJSModuleLoader();

// 便利なヘルパー関数
export const loadThreeJSBasic = () => threeJSLoader.loadBasicThreeJS();
export const loadThreeJSOptimized = () => threeJSLoader.loadOptimized();
export const loadThreeJSProgressive = (options?: ThreeJSLoadingOptions) => 
  threeJSLoader.loadProgressively(options);

// クリーンアップ関数
export const cleanupThreeJSLoader = () => threeJSLoader.cleanup();

// 開発者向けヘルパー
export const getThreeJSLoadingStatus = () => threeJSLoader.getLoadingStatus();