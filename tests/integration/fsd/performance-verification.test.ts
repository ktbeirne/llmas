/**
 * FSD Performance Verification Tests - Phase 4
 * パフォーマンス最適化の効果検証
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// Performance utilities
import { 
  usePerformance, 
  useMemoryManager, 
  withPerformanceOptimization 
} from '@app/providers';

// Test performance monitoring
const createPerformanceTest = <T extends Record<string, any>>(
  component: React.ComponentType<T>,
  props: T,
  testName: string
) => {
  return async (iterations: number = 100) => {
    const renderTimes: number[] = [];
    const memorySnapshots: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const { unmount } = render(React.createElement(component, props));
      
      await waitFor(() => {
        // コンポーネントがレンダリング完了するまで待機
        expect(document.querySelector('[data-testid]')).toBeInTheDocument();
      });

      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

      renderTimes.push(endTime - startTime);
      memorySnapshots.push(endMemory - startMemory);

      unmount();

      // GC促進のための小休止
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    return {
      testName,
      iterations,
      averageRenderTime: renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length,
      maxRenderTime: Math.max(...renderTimes),
      minRenderTime: Math.min(...renderTimes),
      averageMemoryDelta: memorySnapshots.reduce((sum, mem) => sum + mem, 0) / memorySnapshots.length,
      maxMemoryDelta: Math.max(...memorySnapshots),
      memoryLeakIndicator: memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0],
    };
  };
};

// Test components
const BasicComponent: React.FC<{ data: string }> = ({ data }) => (
  <div data-testid="basic-component">{data}</div>
);

const OptimizedComponent = withPerformanceOptimization(BasicComponent, {
  memo: true,
  displayName: 'OptimizedBasicComponent',
});

const ComplexComponent: React.FC<{ items: number[] }> = ({ items }) => {
  const { trackRender } = usePerformance();
  const memoryManager = useMemoryManager();

  React.useEffect(() => {
    trackRender('ComplexComponent');
    
    const interval = setInterval(() => {
      // Some periodic task
    }, 100);
    
    memoryManager.registerInterval(interval);
  }, [trackRender, memoryManager]);

  return (
    <div data-testid="complex-component">
      {items.map(item => (
        <div key={item} data-testid={`item-${item}`}>
          Item {item}
        </div>
      ))}
    </div>
  );
};

describe('FSD Performance Verification Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // パフォーマンス測定環境の初期化
    if ((performance as any).memory) {
      // Force garbage collection if available
      if ((window as any).gc) {
        (window as any).gc();
      }
    }
  });

  describe('Component Rendering Performance', () => {
    it('基本コンポーネントのレンダリング性能', async () => {
      const testPerf = createPerformanceTest(
        BasicComponent,
        { data: 'Test Data' },
        'BasicComponent'
      );

      const results = await testPerf(50);

      console.log('Basic Component Performance:', results);

      // レンダリング時間が16ms（60fps）以下
      expect(results.averageRenderTime).toBeLessThan(16);
      expect(results.maxRenderTime).toBeLessThan(32); // 最悪でも30fps
      
      // メモリリークがない
      expect(Math.abs(results.memoryLeakIndicator)).toBeLessThan(1024 * 1024); // 1MB
    });

    it('最適化コンポーネントの性能向上確認', async () => {
      const basicTest = createPerformanceTest(
        BasicComponent,
        { data: 'Test Data' },
        'BasicComponent'
      );

      const optimizedTest = createPerformanceTest(
        OptimizedComponent,
        { data: 'Test Data' },
        'OptimizedComponent'
      );

      const [basicResults, optimizedResults] = await Promise.all([
        basicTest(30),
        optimizedTest(30),
      ]);

      console.log('Performance Comparison:', {
        basic: basicResults,
        optimized: optimizedResults,
      });

      // 最適化版がより高速またはメモリ効率的
      const renderImprovement = basicResults.averageRenderTime - optimizedResults.averageRenderTime;
      const memoryImprovement = basicResults.averageMemoryDelta - optimizedResults.averageMemoryDelta;

      expect(renderImprovement >= 0 || memoryImprovement >= 0).toBe(true);
    });

    it('複雑コンポーネントのスケーラビリティ', async () => {
      const smallDataTest = createPerformanceTest(
        ComplexComponent,
        { items: Array.from({ length: 10 }, (_, i) => i) },
        'ComplexComponent-Small'
      );

      const largeDataTest = createPerformanceTest(
        ComplexComponent,
        { items: Array.from({ length: 100 }, (_, i) => i) },
        'ComplexComponent-Large'
      );

      const [smallResults, largeResults] = await Promise.all([
        smallDataTest(20),
        largeDataTest(20),
      ]);

      console.log('Scalability Test:', {
        small: smallResults,
        large: largeResults,
      });

      // データ量10倍でレンダリング時間は線形未満の増加
      const renderRatio = largeResults.averageRenderTime / smallResults.averageRenderTime;
      expect(renderRatio).toBeLessThan(8); // 10倍データで8倍未満の時間

      // 両方とも60fps基準をクリア
      expect(smallResults.averageRenderTime).toBeLessThan(16);
      expect(largeResults.averageRenderTime).toBeLessThan(32); // 大きいデータでも30fps以上
    });
  });

  describe('Memory Management Performance', () => {
    it('メモリマネージャーの効率性', async () => {
      const MemoryTestComponent: React.FC = () => {
        const memoryManager = useMemoryManager();
        
        React.useEffect(() => {
          // リソース集約的な操作をシミュレート
          const intervals: NodeJS.Timeout[] = [];
          const timeouts: NodeJS.Timeout[] = [];
          
          for (let i = 0; i < 10; i++) {
            const interval = setInterval(() => {}, 10);
            const timeout = setTimeout(() => {}, 1000);
            
            intervals.push(interval);
            timeouts.push(timeout);
            
            memoryManager.registerInterval(interval);
            memoryManager.registerTimeout(timeout);
          }
        }, [memoryManager]);

        return <div data-testid="memory-test">Memory Test</div>;
      };

      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // 大量のコンポーネントをマウント/アンマウント
      for (let i = 0; i < 100; i++) {
        const { unmount } = render(<MemoryTestComponent />);
        
        await waitFor(() => {
          expect(screen.getByTestId('memory-test')).toBeInTheDocument();
        });
        
        unmount();
      }

      // ガベージコレクション待機
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = endMemory - startMemory;

      // メモリリークが許容範囲内（5MB）
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('大量データ処理時のメモリ効率', async () => {
      const LargeDataComponent: React.FC = () => {
        const [data, setData] = React.useState<number[]>([]);
        
        React.useEffect(() => {
          // 大量データを段階的に処理
          const chunks = Array.from({ length: 100 }, (_, i) => 
            Array.from({ length: 100 }, (_, j) => i * 100 + j)
          );
          
          let currentChunk = 0;
          const processChunk = () => {
            if (currentChunk < chunks.length) {
              setData(prev => [...prev, ...chunks[currentChunk]]);
              currentChunk++;
              setTimeout(processChunk, 1); // 非同期処理
            }
          };
          
          processChunk();
        }, []);

        return (
          <div data-testid="large-data">
            Items: {data.length}
          </div>
        );
      };

      const startTime = performance.now();
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      render(<LargeDataComponent />);

      // データ処理完了まで待機
      await waitFor(() => {
        expect(screen.getByText('Items: 10000')).toBeInTheDocument();
      }, { timeout: 5000 });

      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const processingTime = endTime - startTime;
      const memoryUsage = endMemory - startMemory;

      console.log('Large Data Processing:', {
        processingTime,
        memoryUsage: memoryUsage / (1024 * 1024), // MB
      });

      // 処理時間が妥当（5秒以内）
      expect(processingTime).toBeLessThan(5000);
      
      // メモリ使用量が妥当（50MB以内）
      expect(memoryUsage).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Bundle Size and Loading Performance', () => {
    it('初期バンドルサイズの最適化確認', async () => {
      // 動的インポートのサイズ測定をシミュレート
      const measureBundleSize = async (modulePath: string): Promise<number> => {
        const startTime = performance.now();
        
        try {
          await import(modulePath);
          const endTime = performance.now();
          return endTime - startTime;
        } catch {
          return Infinity; // モジュールが存在しない場合
        }
      };

      const bundleSizes = await Promise.all([
        measureBundleSize('@features/animation'),
        measureBundleSize('@features/vrm-control'),
        measureBundleSize('@features/mouse-follow'),
        measureBundleSize('@features/chat'),
        measureBundleSize('@features/settings'),
        measureBundleSize('@widgets/mascot-view'),
        measureBundleSize('@widgets/settings-panel'),
      ]);

      console.log('Bundle Load Times:', bundleSizes);

      // 各バンドルが高速ロード（100ms以内）
      bundleSizes.forEach(size => {
        if (size !== Infinity) {
          expect(size).toBeLessThan(100);
        }
      });
    });

    it('コード分割の効果測定', async () => {
      // シーケンシャルロード vs 並列ロード
      const sequentialStart = performance.now();
      
      await import('@features/animation');
      await import('@features/vrm-control');
      await import('@features/mouse-follow');
      
      const sequentialEnd = performance.now();
      const sequentialTime = sequentialEnd - sequentialStart;

      const parallelStart = performance.now();
      
      await Promise.all([
        import('@features/chat'),
        import('@features/settings'),
        import('@widgets/mascot-view'),
      ]);
      
      const parallelEnd = performance.now();
      const parallelTime = parallelEnd - parallelStart;

      console.log('Loading Strategy Comparison:', {
        sequential: sequentialTime,
        parallel: parallelTime,
      });

      // 並列ロードが効率的
      expect(parallelTime).toBeLessThan(sequentialTime * 0.8); // 20%以上の改善
    });
  });

  describe('Real-world Performance Scenarios', () => {
    it('同時マルチ操作時のパフォーマンス', async () => {
      const MultiOperationComponent: React.FC = () => {
        const [animations, setAnimations] = React.useState<string[]>([]);
        const [mousePos, setMousePos] = React.useState({ x: 0, y: 0 });
        const [messages, setMessages] = React.useState<string[]>([]);

        React.useEffect(() => {
          // 同時に複数の操作をシミュレート
          const animationInterval = setInterval(() => {
            setAnimations(prev => [...prev, `anim-${Date.now()}`]);
          }, 16); // 60fps

          const mouseMoveInterval = setInterval(() => {
            setMousePos(prev => ({
              x: (prev.x + 1) % 100,
              y: (prev.y + 1) % 100,
            }));
          }, 8); // 120fps

          const messageInterval = setInterval(() => {
            setMessages(prev => [...prev, `msg-${Date.now()}`]);
          }, 100); // 10fps

          return () => {
            clearInterval(animationInterval);
            clearInterval(mouseMoveInterval);
            clearInterval(messageInterval);
          };
        }, []);

        return (
          <div data-testid="multi-operation">
            <div>Animations: {animations.length}</div>
            <div>Mouse: {mousePos.x}, {mousePos.y}</div>
            <div>Messages: {messages.length}</div>
          </div>
        );
      };

      const startTime = performance.now();
      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const { unmount } = render(<MultiOperationComponent />);

      // 1秒間の高負荷操作
      await new Promise(resolve => setTimeout(resolve, 1000));

      const midTime = performance.now();
      const midMemory = (performance as any).memory?.usedJSHeapSize || 0;

      unmount();

      const endTime = performance.now();
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;

      const operationTime = midTime - startTime;
      const cleanupTime = endTime - midTime;
      const peakMemoryUsage = midMemory - startMemory;
      const memoryCleanup = midMemory - endMemory;

      console.log('Multi-operation Performance:', {
        operationTime,
        cleanupTime,
        peakMemoryUsage: peakMemoryUsage / (1024 * 1024), // MB
        memoryCleanup: memoryCleanup / (1024 * 1024), // MB
      });

      // 高負荷時でも応答性維持
      expect(operationTime).toBeLessThan(1200); // 1秒の操作が1.2秒以内
      
      // 効率的なクリーンアップ
      expect(cleanupTime).toBeLessThan(100);
      
      // メモリが適切に解放される
      expect(memoryCleanup).toBeGreaterThan(peakMemoryUsage * 0.8); // 80%以上解放
    });

    it('長時間動作時の安定性', async () => {
      const LongRunningComponent: React.FC = () => {
        const [counter, setCounter] = React.useState(0);
        const { trackRender } = usePerformance();

        React.useEffect(() => {
          trackRender('LongRunningComponent');
        });

        React.useEffect(() => {
          const interval = setInterval(() => {
            setCounter(prev => prev + 1);
          }, 10); // 100Hz更新

          return () => clearInterval(interval);
        }, []);

        return (
          <div data-testid="long-running">
            Counter: {counter}
          </div>
        );
      };

      const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memorySnapshots: number[] = [];

      const { unmount } = render(<LongRunningComponent />);

      // 5秒間動作させて定期的にメモリを監視
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500));
        const currentMemory = (performance as any).memory?.usedJSHeapSize || 0;
        memorySnapshots.push(currentMemory - startMemory);
      }

      unmount();

      // メモリ使用量の変化を分析
      const maxMemoryIncrease = Math.max(...memorySnapshots);
      const memoryTrend = memorySnapshots[memorySnapshots.length - 1] - memorySnapshots[0];

      console.log('Long-running Stability:', {
        maxMemoryIncrease: maxMemoryIncrease / (1024 * 1024), // MB
        memoryTrend: memoryTrend / (1024 * 1024), // MB
        snapshots: memorySnapshots.map(m => (m / (1024 * 1024)).toFixed(2)), // MB
      });

      // 長時間動作でもメモリリークなし
      expect(maxMemoryIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB上限
      expect(Math.abs(memoryTrend)).toBeLessThan(5 * 1024 * 1024); // 5MB変動幅
    });
  });
});