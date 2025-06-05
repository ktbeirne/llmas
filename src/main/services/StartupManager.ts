/**
 * StartupManager - アプリケーション起動シーケンス最適化
 * TDD実装: 優先度付き初期化、適応的ロード、段階的起動
 */

import { performance } from 'perf_hooks';

import { app } from 'electron';

export interface ComponentConfig {
  name: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  dependencies?: string[];
  initFunction: () => Promise<void>;
  timeout?: number;
  retryAttempts?: number;
}

export interface SystemInfo {
  cpuCores: number;
  memoryGB: number;
  isLowPowerMode: boolean;
  storageType: 'hdd' | 'ssd' | 'nvme';
  platform: string;
}

export interface StartupMetrics {
  totalStartupTime: number;
  componentInitTimes: Record<string, number>;
  memoryUsageProgression: number[];
  criticalPath: string[];
  errors: Array<{ component: string; error: string; timestamp: number }>;
}

export interface LoadingStrategy {
  maxConcurrentInits: number;
  enablePreload: boolean;
  heavyComponentDelay: number;
  priorityDelays: Record<string, number>;
}

export class StartupManager {
  private components = new Map<string, ComponentConfig>();
  private initOrder: string[] = [];
  private metrics: Partial<StartupMetrics> = {};
  private startTime = 0;
  private systemInfo: SystemInfo | null = null;
  
  // パフォーマンス監視
  private componentStartTimes = new Map<string, number>();
  private memorySnapshots: number[] = [];
  private errors: Array<{ component: string; error: string; timestamp: number }> = [];
  
  /**
   * コンポーネントの登録
   */
  registerComponent(config: ComponentConfig): void {
    // 依存関係の循環チェック
    if (this.hasCyclicDependency(config.name, config.dependencies || [])) {
      throw new Error(`Cyclic dependency detected for component: ${config.name}`);
    }
    
    this.components.set(config.name, config);
    console.log(`✅ [StartupManager] Registered component: ${config.name} (${config.priority})`);
  }
  
  /**
   * システム情報の設定
   */
  setSystemInfo(info: SystemInfo): void {
    this.systemInfo = info;
    console.log(`📊 [StartupManager] System info updated:`, {
      cpuCores: info.cpuCores,
      memoryGB: info.memoryGB,
      isLowPowerMode: info.isLowPowerMode,
      storageType: info.storageType
    });
  }
  
  /**
   * 起動シーケンス実行
   */
  async initialize(): Promise<StartupMetrics> {
    console.log('🚀 [StartupManager] Starting application initialization...');
    this.startTime = performance.now();
    
    try {
      // システム情報に基づく最適化戦略決定
      const strategy = this.getLoadingStrategy();
      console.log('📋 [StartupManager] Loading strategy:', strategy);
      
      // 依存関係解決と初期化順序決定
      const initOrder = this.resolveDependencies();
      console.log('📝 [StartupManager] Initialization order:', initOrder);
      
      // 優先度グループによる段階的初期化
      await this.initializeByPriority(initOrder, strategy);
      
      // メトリクス収集
      const metrics = this.collectMetrics();
      console.log('📈 [StartupManager] Startup completed:', {
        totalTime: `${metrics.totalStartupTime.toFixed(2)}ms`,
        componentsInitialized: Object.keys(metrics.componentInitTimes).length,
        errors: metrics.errors.length
      });
      
      return metrics;
    } catch (error) {
      console.error('❌ [StartupManager] Startup failed:', error);
      throw error;
    }
  }
  
  /**
   * ローディング戦略の決定
   */
  private getLoadingStrategy(): LoadingStrategy {
    if (!this.systemInfo) {
      return this.getDefaultStrategy();
    }
    
    const { cpuCores, memoryGB, isLowPowerMode, storageType } = this.systemInfo;
    
    // 高性能システム
    if (!isLowPowerMode && cpuCores >= 8 && memoryGB >= 16 && storageType === 'nvme') {
      return {
        maxConcurrentInits: Math.min(cpuCores, 12),
        enablePreload: true,
        heavyComponentDelay: 0,
        priorityDelays: {
          critical: 0,
          high: 0,
          normal: 100,
          low: 500
        }
      };
    }
    
    // 中性能システム
    if (!isLowPowerMode && cpuCores >= 4 && memoryGB >= 8) {
      return {
        maxConcurrentInits: 4,
        enablePreload: true,
        heavyComponentDelay: 200,
        priorityDelays: {
          critical: 0,
          high: 100,
          normal: 300,
          low: 1000
        }
      };
    }
    
    // 低性能システム
    return {
      maxConcurrentInits: 2,
      enablePreload: false,
      heavyComponentDelay: 500,
      priorityDelays: {
        critical: 0,
        high: 200,
        normal: 500,
        low: 1500
      }
    };
  }
  
  private getDefaultStrategy(): LoadingStrategy {
    return {
      maxConcurrentInits: 3,
      enablePreload: false,
      heavyComponentDelay: 300,
      priorityDelays: {
        critical: 0,
        high: 100,
        normal: 300,
        low: 1000
      }
    };
  }
  
  /**
   * 依存関係解決
   */
  private resolveDependencies(): string[] {
    const resolved: string[] = [];
    const visiting = new Set<string>();
    
    const visit = (componentName: string) => {
      if (resolved.includes(componentName)) return;
      if (visiting.has(componentName)) {
        throw new Error(`Circular dependency detected: ${componentName}`);
      }
      
      visiting.add(componentName);
      
      const component = this.components.get(componentName);
      if (!component) {
        throw new Error(`Component not found: ${componentName}`);
      }
      
      // 依存関係を先に解決
      if (component.dependencies) {
        for (const dep of component.dependencies) {
          visit(dep);
        }
      }
      
      visiting.delete(componentName);
      resolved.push(componentName);
    };
    
    // 全コンポーネントを処理
    for (const [componentName] of this.components) {
      visit(componentName);
    }
    
    // 優先度でソート（依存関係を保持しつつ）
    return this.sortByPriority(resolved);
  }
  
  /**
   * 優先度による段階的初期化
   */
  private async initializeByPriority(
    initOrder: string[],
    strategy: LoadingStrategy
  ): Promise<void> {
    const priorities = ['critical', 'high', 'normal', 'low'];
    
    for (const priority of priorities) {
      const componentsInPriority = initOrder.filter(
        name => this.components.get(name)?.priority === priority
      );
      
      if (componentsInPriority.length === 0) continue;
      
      console.log(`🔄 [StartupManager] Initializing ${priority} priority components:`, componentsInPriority);
      
      // 優先度による遅延
      const delay = strategy.priorityDelays[priority] || 0;
      if (delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // 同じ優先度内で並列実行（制限あり）
      await this.initializeInBatches(
        componentsInPriority,
        strategy.maxConcurrentInits
      );
    }
  }
  
  /**
   * バッチ単位での並列初期化
   */
  private async initializeInBatches(
    componentNames: string[],
    batchSize: number
  ): Promise<void> {
    for (let i = 0; i < componentNames.length; i += batchSize) {
      const batch = componentNames.slice(i, i + batchSize);
      
      const initPromises = batch.map(name => this.initializeComponent(name));
      
      try {
        await Promise.allSettled(initPromises);
      } catch (error) {
        console.warn(`⚠️ [StartupManager] Batch initialization had failures:`, error);
      }
    }
  }
  
  /**
   * 個別コンポーネントの初期化
   */
  private async initializeComponent(name: string): Promise<void> {
    const component = this.components.get(name);
    if (!component) {
      throw new Error(`Component not found: ${name}`);
    }
    
    const startTime = performance.now();
    this.componentStartTimes.set(name, startTime);
    this.recordMemoryUsage();
    
    try {
      console.log(`⚡ [StartupManager] Initializing ${name}...`);
      
      // タイムアウト設定
      const timeout = component.timeout || 30000;
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout: ${name}`)), timeout);
      });
      
      // リトライ機能付き初期化
      await this.initializeWithRetry(
        component,
        timeoutPromise as Promise<never>,
        component.retryAttempts || 2
      );
      
      const endTime = performance.now();
      const initTime = endTime - startTime;
      
      console.log(`✅ [StartupManager] ${name} initialized in ${initTime.toFixed(2)}ms`);
      this.metrics.componentInitTimes = {
        ...this.metrics.componentInitTimes,
        [name]: initTime
      };
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`❌ [StartupManager] Failed to initialize ${name}:`, errorMsg);
      
      this.errors.push({
        component: name,
        error: errorMsg,
        timestamp: Date.now()
      });
      
      // クリティカル・ハイ優先度の失敗は致命的
      if (['critical', 'high'].includes(component.priority)) {
        throw new Error(`Critical component failed: ${name} - ${errorMsg}`);
      }
    }
  }
  
  /**
   * リトライ機能付き初期化
   */
  private async initializeWithRetry(
    component: ComponentConfig,
    timeoutPromise: Promise<never>,
    maxRetries: number
  ): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        await Promise.race([
          component.initFunction(),
          timeoutPromise
        ]);
        return; // 成功
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 指数バックオフ
          console.warn(`⚠️ [StartupManager] ${component.name} failed (attempt ${attempt + 1}), retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }
  
  /**
   * メトリクス収集
   */
  private collectMetrics(): StartupMetrics {
    const totalTime = performance.now() - this.startTime;
    
    return {
      totalStartupTime: totalTime,
      componentInitTimes: this.metrics.componentInitTimes || {},
      memoryUsageProgression: this.memorySnapshots,
      criticalPath: this.calculateCriticalPath(),
      errors: this.errors
    };
  }
  
  /**
   * クリティカルパス計算
   */
  private calculateCriticalPath(): string[] {
    // 依存関係を考慮した最長パスを計算
    const componentTimes = this.metrics.componentInitTimes || {};
    
    return Object.entries(componentTimes)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name]) => name);
  }
  
  /**
   * ユーティリティメソッド
   */
  
  private hasCyclicDependency(name: string, deps: string[]): boolean {
    // 簡単な循環依存チェック
    const visited = new Set<string>();
    
    const visit = (current: string): boolean => {
      if (visited.has(current)) return true;
      visited.add(current);
      
      const component = this.components.get(current);
      if (component?.dependencies) {
        for (const dep of component.dependencies) {
          if (dep === name || visit(dep)) return true;
        }
      }
      
      visited.delete(current);
      return false;
    };
    
    return deps.some(dep => visit(dep));
  }
  
  private sortByPriority(componentNames: string[]): string[] {
    const priorities = { critical: 4, high: 3, normal: 2, low: 1 };
    
    return componentNames.sort((a, b) => {
      const aComponent = this.components.get(a);
      const bComponent = this.components.get(b);
      
      if (!aComponent || !bComponent) return 0;
      
      const aPriority = priorities[aComponent.priority];
      const bPriority = priorities[bComponent.priority];
      
      return bPriority - aPriority;
    });
  }
  
  private recordMemoryUsage(): void {
    if (process.memoryUsage) {
      const usage = process.memoryUsage();
      const usageRatio = usage.heapUsed / usage.heapTotal;
      this.memorySnapshots.push(usageRatio);
    }
  }
  
  /**
   * システム情報の自動検出
   */
  static async detectSystemInfo(): Promise<SystemInfo> {
    const os = await import('os');
    
    // CPU情報
    const cpuCores = os.cpus().length;
    
    // メモリ情報（GB）
    const memoryGB = Math.round(os.totalmem() / (1024 * 1024 * 1024));
    
    // 低電力モード検出（プラットフォーム依存）
    let isLowPowerMode = false;
    try {
      if (process.platform === 'darwin') {
        // macOSの場合はpmsetコマンドで確認（簡略化）
        isLowPowerMode = process.env.NODE_ENV === 'development';
      }
    } catch (error) {
      console.warn('Could not detect power mode:', error);
    }
    
    // ストレージタイプ検出（簡略化）
    const storageType: 'hdd' | 'ssd' | 'nvme' = 'ssd';
    
    return {
      cpuCores,
      memoryGB,
      isLowPowerMode,
      storageType,
      platform: process.platform
    };
  }
  
  /**
   * 最適化提案生成
   */
  generateOptimizationSuggestions(metrics: StartupMetrics): string[] {
    const suggestions: string[] = [];
    
    // 起動時間が長い
    if (metrics.totalStartupTime > 3000) {
      suggestions.push('consider-lazy-loading');
      suggestions.push('optimize-critical-path');
    }
    
    // エラーが多い
    if (metrics.errors.length > 0) {
      suggestions.push('improve-error-handling');
      suggestions.push('add-component-health-checks');
    }
    
    // メモリ使用量が高い
    const maxMemoryUsage = Math.max(...metrics.memoryUsageProgression);
    if (maxMemoryUsage > 0.8) {
      suggestions.push('optimize-memory-usage');
      suggestions.push('implement-memory-monitoring');
    }
    
    return suggestions;
  }
  
  /**
   * デバッグ情報
   */
  getDebugInfo() {
    return {
      registeredComponents: Array.from(this.components.keys()),
      systemInfo: this.systemInfo,
      lastMetrics: this.metrics,
      componentCount: this.components.size
    };
  }
}

// シングルトンインスタンス
export const startupManager = new StartupManager();