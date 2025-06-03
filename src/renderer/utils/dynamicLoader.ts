/**
 * Dynamic Module Loader
 * TDD実装: Code splitting と動的インポートの管理
 */

export interface LoadingProgress {
  current: number;
  total: number;
  percentage: number;
  moduleName: string;
}

export interface LoadingOptions {
  enablePreload?: boolean;
  timeout?: number;
  retryAttempts?: number;
}

export class DynamicModuleLoader {
  private loadingStates = new Map<string, 'idle' | 'loading' | 'loaded' | 'error'>();
  private moduleCache = new Map<string, any>();
  private loadingPromises = new Map<string, Promise<any>>();
  private progressCallbacks: Array<(progress: LoadingProgress) => void> = [];
  private totalModules = 0;
  private loadedModules = 0;
  
  /**
   * Three.jsモジュールの動的読み込み
   */
  async loadThreeJS(): Promise<typeof import('three')> {
    return this.loadModule('three', () => import('three'));
  }
  
  /**
   * VRM関連モジュールの動的読み込み
   */
  async loadVRMModules(): Promise<typeof import('@pixiv/three-vrm')> {
    return this.loadModule('@pixiv/three-vrm', () => import('@pixiv/three-vrm'));
  }
  
  /**
   * VRMアニメーションモジュールの動的読み込み
   */
  async loadVRMAnimationModules(): Promise<typeof import('@pixiv/three-vrm-animation')> {
    return this.loadModule('@pixiv/three-vrm-animation', () => import('@pixiv/three-vrm-animation'));
  }
  
  /**
   * React設定コンポーネントの動的読み込み
   */
  async loadSettingsComponent(): Promise<React.ComponentType> {
    return this.loadModule('settings-component', async () => {
      const module = await import('../components/settings/SettingsWindow');
      return module.default || module.SettingsWindow;
    });
  }
  
  /**
   * Reactチャットコンポーネントの動的読み込み
   */
  async loadChatComponent(): Promise<React.ComponentType> {
    return this.loadModule('chat-component', async () => {
      // チャットコンポーネントが実装されたら更新
      const module = await import('../apps/ChatApp');
      return module.default || module.ChatApp;
    });
  }
  
  /**
   * Google AI モジュールの動的読み込み
   */
  async loadGoogleAI(): Promise<typeof import('@google/generative-ai')> {
    return this.loadModule('@google/generative-ai', () => import('@google/generative-ai'));
  }
  
  /**
   * Zustand状態管理の動的読み込み
   */
  async loadZustand(): Promise<typeof import('zustand')> {
    return this.loadModule('zustand', () => import('zustand'));
  }
  
  /**
   * 基本モジュールのバッチ読み込み（軽量）
   */
  async loadBasicModules(): Promise<{
    react: typeof import('react');
    reactDOM: typeof import('react-dom');
  }> {
    const [react, reactDOM] = await Promise.all([
      this.loadModule('react', () => import('react')),
      this.loadModule('react-dom', () => import('react-dom'))
    ]);
    
    return { react, reactDOM };
  }
  
  /**
   * 高度な機能モジュールの読み込み（重い）
   */
  async loadAdvancedModules(): Promise<{
    three: typeof import('three');
    vrm: typeof import('@pixiv/three-vrm');
    vrmAnimation: typeof import('@pixiv/three-vrm-animation');
  }> {
    this.totalModules = 3;
    this.loadedModules = 0;
    
    const [three, vrm, vrmAnimation] = await Promise.all([
      this.loadThreeJS(),
      this.loadVRMModules(),
      this.loadVRMAnimationModules()
    ]);
    
    return { three, vrm, vrmAnimation };
  }
  
  /**
   * すべてのモジュールの順次読み込み（進捗付き）
   */
  async loadAllModules(options: LoadingOptions = {}): Promise<void> {
    const modules = [
      { name: 'react', loader: () => this.loadModule('react', () => import('react')) },
      { name: 'react-dom', loader: () => this.loadModule('react-dom', () => import('react-dom')) },
      { name: 'three', loader: () => this.loadThreeJS() },
      { name: '@pixiv/three-vrm', loader: () => this.loadVRMModules() },
      { name: 'zustand', loader: () => this.loadZustand() },
    ];
    
    this.totalModules = modules.length;
    this.loadedModules = 0;
    
    for (const module of modules) {
      try {
        await module.loader();
        this.loadedModules++;
        this.notifyProgress(module.name);
      } catch (error) {
        console.error(`Failed to load module ${module.name}:`, error);
        this.loadingStates.set(module.name, 'error');
        
        if (options.retryAttempts && options.retryAttempts > 0) {
          // リトライ実装
          await this.retryLoad(module.name, module.loader, options.retryAttempts);
        }
      }
    }
  }
  
  /**
   * プリロード戦略実装
   */
  async preloadModules(moduleNames: string[]): Promise<void> {
    const preloadPromises = moduleNames.map(async (moduleName) => {
      try {
        // 低優先度でプリロード
        await this.schedulePreload(moduleName);
      } catch (error) {
        console.warn(`Preload failed for ${moduleName}:`, error);
      }
    });
    
    await Promise.allSettled(preloadPromises);
  }
  
  /**
   * モジュールの読み込み状態確認
   */
  isModuleLoaded(moduleName: string): boolean {
    return this.loadingStates.get(moduleName) === 'loaded';
  }
  
  /**
   * 読み込み進捗のコールバック登録
   */
  onProgress(callback: (progress: LoadingProgress) => void): void {
    this.progressCallbacks.push(callback);
  }
  
  /**
   * プログレス通知のクリア
   */
  clearProgressCallbacks(): void {
    this.progressCallbacks = [];
  }
  
  /**
   * キャッシュされたモジュールの取得
   */
  getCachedModule<T = any>(moduleName: string): T | null {
    return this.moduleCache.get(moduleName) || null;
  }
  
  /**
   * メモリクリーンアップ
   */
  cleanup(): void {
    this.moduleCache.clear();
    this.loadingPromises.clear();
    this.loadingStates.clear();
    this.progressCallbacks = [];
    this.totalModules = 0;
    this.loadedModules = 0;
  }
  
  // Private methods
  
  private async loadModule<T>(
    moduleName: string,
    loader: () => Promise<T>
  ): Promise<T> {
    // キャッシュから返す
    if (this.moduleCache.has(moduleName)) {
      return this.moduleCache.get(moduleName);
    }
    
    // 既に読み込み中の場合は同じPromiseを返す
    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }
    
    // 読み込み開始
    this.loadingStates.set(moduleName, 'loading');
    
    const loadingPromise = this.executeLoad(moduleName, loader);
    this.loadingPromises.set(moduleName, loadingPromise);
    
    try {
      const module = await loadingPromise;
      
      // キャッシュに保存
      this.moduleCache.set(moduleName, module);
      this.loadingStates.set(moduleName, 'loaded');
      
      // 読み込み完了後はPromiseを削除
      this.loadingPromises.delete(moduleName);
      
      return module;
    } catch (error) {
      this.loadingStates.set(moduleName, 'error');
      this.loadingPromises.delete(moduleName);
      throw error;
    }
  }
  
  private async executeLoad<T>(
    moduleName: string,
    loader: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    
    try {
      const module = await loader();
      const loadTime = performance.now() - startTime;
      
      console.log(`✅ [DynamicLoader] ${moduleName} loaded in ${loadTime.toFixed(2)}ms`);
      return module;
    } catch (error) {
      const loadTime = performance.now() - startTime;
      console.error(`❌ [DynamicLoader] ${moduleName} failed to load after ${loadTime.toFixed(2)}ms:`, error);
      throw error;
    }
  }
  
  private async retryLoad<T>(
    moduleName: string,
    loader: () => Promise<T>,
    attemptsLeft: number
  ): Promise<T> {
    if (attemptsLeft <= 0) {
      throw new Error(`Failed to load ${moduleName} after all retry attempts`);
    }
    
    // 指数バックオフで待機
    const delay = Math.pow(2, 3 - attemptsLeft) * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      return await this.loadModule(moduleName, loader);
    } catch (error) {
      return this.retryLoad(moduleName, loader, attemptsLeft - 1);
    }
  }
  
  private async schedulePreload(moduleName: string): Promise<void> {
    // requestIdleCallback を使用した低優先度読み込み
    return new Promise((resolve, reject) => {
      const loadModule = async () => {
        try {
          switch (moduleName) {
            case 'settings-component':
              await this.loadSettingsComponent();
              break;
            case 'chat-component':
              await this.loadChatComponent();
              break;
            case '@google/generative-ai':
              await this.loadGoogleAI();
              break;
            default:
              console.warn(`Unknown module for preload: ${moduleName}`);
          }
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(loadModule, { timeout: 5000 });
      } else {
        setTimeout(loadModule, 100);
      }
    });
  }
  
  private notifyProgress(moduleName: string): void {
    const progress: LoadingProgress = {
      current: this.loadedModules,
      total: this.totalModules,
      percentage: (this.loadedModules / this.totalModules) * 100,
      moduleName,
    };
    
    this.progressCallbacks.forEach(callback => {
      try {
        callback(progress);
      } catch (error) {
        console.error('Error in progress callback:', error);
      }
    });
  }
}

// シングルトンインスタンス
export const dynamicLoader = new DynamicModuleLoader();

// 使いやすいヘルパー関数
export const loadThreeJS = () => dynamicLoader.loadThreeJS();
export const loadVRMModules = () => dynamicLoader.loadVRMModules();
export const loadSettingsComponent = () => dynamicLoader.loadSettingsComponent();
export const loadChatComponent = () => dynamicLoader.loadChatComponent();

// クリーンアップ関数
export const cleanupDynamicLoader = () => dynamicLoader.cleanup();