import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * アプリケーション起動シーケンス最適化テスト
 * TDD: 起動時間短縮、優先度付きロード、適応的初期化の検証
 */
describe('Application Startup Sequence Optimization Tests', () => {
  
  describe('Priority-based Initialization', () => {
    let startupManager: TestStartupManager;
    
    beforeEach(() => {
      startupManager = new TestStartupManager();
      vi.clearAllMocks();
    });
    
    afterEach(() => {
      startupManager.cleanup();
    });
    
    it('should initialize critical components first', async () => {
      // TDD: 期待値 - 重要なコンポーネントが最初に初期化される
      const initOrder: string[] = [];
      const mockComponents = {
        'logger': { priority: 'critical', initTime: 50 },
        'config': { priority: 'critical', initTime: 30 },
        'vrm-loader': { priority: 'normal', initTime: 200 },
        'ui-components': { priority: 'normal', initTime: 100 },
        'analytics': { priority: 'low', initTime: 150 }
      };
      
      startupManager.registerComponents(mockComponents);
      startupManager.setInitCallback((name: string) => initOrder.push(name));
      
      await startupManager.initializeInPriority();
      
      // 優先度順で初期化されることを確認
      expect(initOrder[0]).toBe('config'); // critical優先、短時間優先
      expect(initOrder[1]).toBe('logger'); // critical
      expect(initOrder.slice(0, 2)).toEqual(expect.arrayContaining(['config', 'logger']));
      
      // normalとlowは後で初期化
      expect(initOrder.slice(2)).toEqual(expect.arrayContaining(['ui-components', 'vrm-loader', 'analytics']));
    });
    
    it('should support parallel initialization within same priority', async () => {
      // TDD: 期待値 - 同じ優先度のコンポーネントは並列初期化
      const startupTimes: Record<string, number> = {};
      const mockComponents = {
        'service1': { priority: 'normal', initTime: 100 },
        'service2': { priority: 'normal', initTime: 100 },
        'service3': { priority: 'normal', initTime: 100 }
      };
      
      startupManager.registerComponents(mockComponents);
      startupManager.setInitCallback((name: string) => {
        startupTimes[name] = Date.now();
      });
      
      const startTime = Date.now();
      await startupManager.initializeInPriority();
      const totalTime = Date.now() - startTime;
      
      // 並列実行により、3つのサービスが約100msで完了（300msでなく）
      expect(totalTime).toBeLessThan(150);
      
      // 全てのサービスがほぼ同時に開始されている
      const initTimes = Object.values(startupTimes);
      const timeDiff = Math.max(...initTimes) - Math.min(...initTimes);
      expect(timeDiff).toBeLessThan(50); // 50ms以内の差
    });
    
    it('should handle initialization failures gracefully', async () => {
      // TDD: 期待値 - 初期化失敗の適切な処理
      const successfulInits: string[] = [];
      const mockComponents = {
        'working-service': { priority: 'critical', initTime: 50 },
        'failing-service': { priority: 'critical', initTime: 50, shouldFail: true },
        'dependent-service': { priority: 'normal', initTime: 30 }
      };
      
      startupManager.registerComponents(mockComponents);
      startupManager.setInitCallback((name: string) => successfulInits.push(name));
      
      const result = await startupManager.initializeInPriority();
      
      // 作業サービスは成功
      expect(successfulInits).toContain('working-service');
      expect(successfulInits).toContain('dependent-service');
      
      // 失敗情報が記録される
      expect(result.failed).toContain('failing-service');
      expect(result.successful.length).toBe(2);
      expect(result.failed.length).toBe(1);
    });
  });
  
  describe('Adaptive Loading Strategy', () => {
    let adaptiveLoader: TestAdaptiveLoader;
    
    beforeEach(() => {
      adaptiveLoader = new TestAdaptiveLoader();
    });
    
    it('should adjust loading strategy based on system performance', async () => {
      // TDD: 期待値 - システム性能に基づく適応ロード
      const systemInfo = {
        cpuCores: 2,
        memoryGB: 4,
        isLowPowerMode: true,
        storageType: 'ssd'
      };
      
      adaptiveLoader.setSystemInfo(systemInfo);
      
      const strategy = await adaptiveLoader.getLoadingStrategy();
      
      // 低性能モードでは控えめな設定
      expect(strategy.maxConcurrentInits).toBe(2);
      expect(strategy.enablePreload).toBe(false);
      expect(strategy.heavyComponentDelay).toBeGreaterThan(0);
    });
    
    it('should optimize for high-performance systems', async () => {
      // TDD: 期待値 - 高性能システムでの最適化
      const systemInfo = {
        cpuCores: 8,
        memoryGB: 16,
        isLowPowerMode: false,
        storageType: 'nvme'
      };
      
      adaptiveLoader.setSystemInfo(systemInfo);
      
      const strategy = await adaptiveLoader.getLoadingStrategy();
      
      // 高性能システムでは積極的な設定
      expect(strategy.maxConcurrentInits).toBeGreaterThan(4);
      expect(strategy.enablePreload).toBe(true);
      expect(strategy.heavyComponentDelay).toBe(0);
    });
    
    it('should measure and improve based on startup metrics', async () => {
      // TDD: 期待値 - 起動メトリクスに基づく改善
      const initialMetrics = {
        startupTime: 3000, // 3秒
        timeToInteractive: 5000, // 5秒
        memoryUsage: 0.7 // 70%
      };
      
      adaptiveLoader.recordStartupMetrics(initialMetrics);
      
      const optimizations = adaptiveLoader.getOptimizationSuggestions();
      
      // 起動時間が長いので最適化提案
      expect(optimizations).toContain('reduce-initial-bundle');
      expect(optimizations).toContain('defer-heavy-components');
      
      // メモリ使用量が高いので提案
      expect(optimizations).toContain('optimize-memory-usage');
    });
  });
  
  describe('Progressive Enhancement', () => {
    it('should implement progressive component loading', async () => {
      // TDD: 期待値 - 段階的コンポーネントロード
      const progressiveLoader = new TestProgressiveLoader();
      const loadingStages: string[] = [];
      
      progressiveLoader.setStageCallback((stage: string) => loadingStages.push(stage));
      
      await progressiveLoader.loadProgressively();
      
      // 段階的な読み込み順序
      expect(loadingStages).toEqual([
        'core-services',     // 最優先
        'ui-shell',          // 基本UI
        'main-features',     // メイン機能
        'enhanced-features', // 拡張機能
        'background-tasks'   // バックグラウンド
      ]);
    });
    
    it('should support user interaction during loading', async () => {
      // TDD: 期待値 - ロード中のユーザー操作対応
      const progressiveLoader = new TestProgressiveLoader();
      let interactionEnabled = false;
      
      progressiveLoader.setInteractionCallback(() => {
        interactionEnabled = true;
      });
      
      const loadingPromise = progressiveLoader.loadProgressively();
      
      // UI shellロード後は操作可能
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(interactionEnabled).toBe(true);
      
      await loadingPromise;
    });
  });
  
  describe('Startup Performance Monitoring', () => {
    it('should track detailed startup metrics', async () => {
      // TDD: 期待値 - 詳細な起動メトリクス追跡
      const performanceMonitor = new TestStartupPerformanceMonitor();
      
      performanceMonitor.startTracking();
      
      // 模擬的な起動プロセス
      await simulateStartupProcess(performanceMonitor);
      
      const metrics = performanceMonitor.getMetrics();
      
      // 必要なメトリクスが記録されている
      expect(metrics.totalStartupTime).toBeGreaterThan(0);
      expect(metrics.componentInitTimes).toBeDefined();
      expect(metrics.memoryUsageProgression).toBeDefined();
      expect(metrics.criticalPath).toBeDefined();
      
      // パフォーマンス基準を満たしている
      expect(metrics.totalStartupTime).toBeLessThan(2000); // 2秒以下
    });
  });
});

// テスト用のクラス実装

class TestStartupManager {
  private components = new Map<string, any>();
  private initCallback: ((name: string) => void) | null = null;
  
  registerComponents(components: Record<string, any>) {
    Object.entries(components).forEach(([name, config]) => {
      this.components.set(name, config);
    });
  }
  
  setInitCallback(callback: (name: string) => void) {
    this.initCallback = callback;
  }
  
  async initializeInPriority() {
    const priorities = ['critical', 'normal', 'low'];
    const failed: string[] = [];
    const successful: string[] = [];
    
    for (const priority of priorities) {
      const componentsInPriority = Array.from(this.components.entries())
        .filter(([, config]) => config.priority === priority)
        .sort((a, b) => a[1].initTime - b[1].initTime);
      
      // 同じ優先度は並列実行
      const initPromises = componentsInPriority.map(async ([name, config]) => {
        try {
          if (config.shouldFail) {
            throw new Error(`Failed to initialize ${name}`);
          }
          
          await new Promise(resolve => setTimeout(resolve, config.initTime));
          
          if (this.initCallback) {
            this.initCallback(name);
          }
          
          successful.push(name);
        } catch (error) {
          failed.push(name);
        }
      });
      
      await Promise.all(initPromises);
    }
    
    return { successful, failed };
  }
  
  cleanup() {
    this.components.clear();
    this.initCallback = null;
  }
}

class TestAdaptiveLoader {
  private systemInfo: any = {};
  private startupMetrics: any = {};
  
  setSystemInfo(info: any) {
    this.systemInfo = info;
  }
  
  recordStartupMetrics(metrics: any) {
    this.startupMetrics = metrics;
  }
  
  async getLoadingStrategy() {
    const { cpuCores, memoryGB, isLowPowerMode } = this.systemInfo;
    
    if (isLowPowerMode || cpuCores <= 2 || memoryGB <= 4) {
      return {
        maxConcurrentInits: 2,
        enablePreload: false,
        heavyComponentDelay: 1000
      };
    } else {
      return {
        maxConcurrentInits: Math.min(cpuCores, 8),
        enablePreload: true,
        heavyComponentDelay: 0
      };
    }
  }
  
  getOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const { startupTime, memoryUsage } = this.startupMetrics;
    
    if (startupTime > 2000) {
      suggestions.push('reduce-initial-bundle', 'defer-heavy-components');
    }
    
    if (memoryUsage > 0.6) {
      suggestions.push('optimize-memory-usage');
    }
    
    return suggestions;
  }
}

class TestProgressiveLoader {
  private stageCallback: ((stage: string) => void) | null = null;
  private interactionCallback: (() => void) | null = null;
  
  setStageCallback(callback: (stage: string) => void) {
    this.stageCallback = callback;
  }
  
  setInteractionCallback(callback: () => void) {
    this.interactionCallback = callback;
  }
  
  async loadProgressively() {
    const stages = [
      'core-services',
      'ui-shell',
      'main-features',
      'enhanced-features',
      'background-tasks'
    ];
    
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      
      if (this.stageCallback) {
        this.stageCallback(stage);
      }
      
      // UI shellロード後は操作可能
      if (stage === 'ui-shell' && this.interactionCallback) {
        this.interactionCallback();
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
}

class TestStartupPerformanceMonitor {
  private startTime = 0;
  private componentTimes = new Map<string, number>();
  private memorySnapshots: number[] = [];
  
  startTracking() {
    this.startTime = Date.now();
  }
  
  recordComponentInit(name: string, time: number) {
    this.componentTimes.set(name, time);
  }
  
  recordMemoryUsage(usage: number) {
    this.memorySnapshots.push(usage);
  }
  
  getMetrics() {
    const totalStartupTime = Date.now() - this.startTime;
    
    return {
      totalStartupTime,
      componentInitTimes: Object.fromEntries(this.componentTimes),
      memoryUsageProgression: this.memorySnapshots,
      criticalPath: this.calculateCriticalPath()
    };
  }
  
  private calculateCriticalPath() {
    // 簡略化されたクリティカルパス計算
    return Array.from(this.componentTimes.keys());
  }
}

async function simulateStartupProcess(monitor: TestStartupPerformanceMonitor) {
  const components = ['logger', 'config', 'ui', 'vrm-loader'];
  
  for (const component of components) {
    const initTime = Math.random() * 100 + 50;
    monitor.recordComponentInit(component, initTime);
    monitor.recordMemoryUsage(Math.random() * 0.5 + 0.3);
    await new Promise(resolve => setTimeout(resolve, initTime));
  }
}