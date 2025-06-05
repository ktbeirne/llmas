/**
 * FSD App Integration Tests - Phase 4  
 * App層の統合テスト：アプリケーション全体の動作確認
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';

// App layer imports
import { AppProviders, appMeta } from '@app';
import { 
  preloadCriticalWidgets, 
  preloadSecondaryWidgets,
  LazyMascotView,
  LazySettingsPanel 
} from '@app/providers';

// Performance monitoring
import { usePerformance } from '@app/providers';

// Test application component
const TestApp: React.FC = () => {
  const { trackRender, metrics } = usePerformance();

  React.useEffect(() => {
    trackRender('TestApp');
  }, [trackRender]);

  return (
    <div data-testid="test-app">
      <LazyMascotView />
      <LazySettingsPanel />
      <div data-testid="performance-metrics">
        Renders: {metrics.renderCount}
      </div>
    </div>
  );
};

describe('FSD App Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Application Initialization', () => {
    it('アプリケーションが正しいメタデータで初期化される', () => {
      expect(appMeta.name).toBe('llmdesktopmascot');
      expect(appMeta.architecture).toBe('Feature-Sliced Design (FSD)');
      expect(appMeta.performance.lazyLoading).toBe(true);
      expect(appMeta.performance.codesplitting).toBe(true);
      expect(appMeta.features).toContain('vrm-control');
      expect(appMeta.features).toContain('mouse-follow');
      expect(appMeta.widgets).toContain('mascot-view');
    });

    it('AppProvidersが正しく初期化される', async () => {
      render(
        <AppProviders enablePerformanceMonitoring={true}>
          <div data-testid="app-content">Test Content</div>
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('app-content')).toBeInTheDocument();
      });

      // Provider contextsが利用可能
      expect(screen.getByTestId('app-content')).toBeInTheDocument();
    });

    it('パフォーマンス監視が正しく動作する', async () => {
      render(
        <AppProviders enablePerformanceMonitoring={true}>
          <TestApp />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-app')).toBeInTheDocument();
      });

      // パフォーマンスメトリクスが取得される
      const metrics = screen.getByTestId('performance-metrics');
      expect(metrics).toHaveTextContent(/renders:/i);
    });
  });

  describe('Lazy Loading Integration', () => {
    it('クリティカルwidgetの事前ロード', async () => {
      const loadStart = performance.now();
      
      await preloadCriticalWidgets();
      
      const loadEnd = performance.now();
      const loadTime = loadEnd - loadStart;

      // クリティカルwidgetは高速ロード（500ms以下）
      expect(loadTime).toBeLessThan(500);
    });

    it('セカンダリwidgetの段階的ロード', async () => {
      const loadPromise = preloadSecondaryWidgets();

      // ロード中状態の確認
      expect(loadPromise).toBeInstanceOf(Promise);

      await loadPromise;

      // セカンダリwidgetロード完了
      expect(loadPromise).resolves.toBeUndefined();
    });

    it('レイジーロードのフォールバック機能', async () => {
      // ネットワーク遅延をシミュレート
      const originalImport = global.import;
      global.import = vi.fn().mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 1000))
      );

      render(
        <AppProviders>
          <LazyMascotView />
        </AppProviders>
      );

      // ロード中フォールバック表示
      expect(screen.getByText(/loading/i)).toBeInTheDocument();

      global.import = originalImport;
    });
  });

  describe('Performance Optimization Integration', () => {
    it('メモリ使用量監視', async () => {
      const { unmount } = render(
        <AppProviders enablePerformanceMonitoring={true}>
          <TestApp />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-app')).toBeInTheDocument();
      });

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // アプリケーション操作をシミュレート
      for (let i = 0; i < 100; i++) {
        render(
          <AppProviders>
            <div>Dynamic Content {i}</div>
          </AppProviders>
        ).unmount();
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリリークが許容範囲内
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024); // 10MB

      unmount();
    });

    it('レンダリングパフォーマンス最適化', async () => {
      const renderTimes: number[] = [];
      let renderCount = 0;

      const TestComponent: React.FC = () => {
        const startTime = React.useRef<number>();
        
        React.useLayoutEffect(() => {
          startTime.current = performance.now();
        });

        React.useEffect(() => {
          if (startTime.current) {
            renderTimes.push(performance.now() - startTime.current);
            renderCount++;
          }
        });

        return <div>Render {renderCount}</div>;
      };

      const { rerender } = render(
        <AppProviders>
          <TestComponent />
        </AppProviders>
      );

      // 複数回再レンダリング
      for (let i = 0; i < 50; i++) {
        rerender(
          <AppProviders>
            <TestComponent key={i} />
          </AppProviders>
        );
      }

      await waitFor(() => {
        expect(renderTimes.length).toBeGreaterThan(10);
      });

      // 平均レンダリング時間が60fps基準（16ms）以下
      const averageRenderTime = renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length;
      expect(averageRenderTime).toBeLessThan(16);
    });

    it('コード分割の効果確認', async () => {
      // 初期バンドルサイズをシミュレート
      const initialScripts = document.querySelectorAll('script').length;

      render(
        <AppProviders>
          <LazyMascotView />
          <LazySettingsPanel />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
      });

      // 動的に追加されたスクリプト数（コード分割の効果）
      const finalScripts = document.querySelectorAll('script').length;
      expect(finalScripts).toBeGreaterThan(initialScripts);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('グローバルエラーハンドリング', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const ErrorComponent: React.FC = () => {
        throw new Error('Test error');
      };

      render(
        <AppProviders>
          <ErrorComponent />
        </AppProviders>
      );

      // エラーバウンダリが動作
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      expect(screen.getByText(/loading error/i)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('Feature障害時のアプリケーション継続性', async () => {
      // 一部feature失敗をシミュレート
      vi.doMock('@features/chat', () => {
        throw new Error('Chat feature unavailable');
      });

      render(
        <AppProviders>
          <LazyMascotView />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
      });

      // チャット機能は無効だが、他の機能は動作
      expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
    });

    it('ネットワーク切断時の動作', async () => {
      // オフライン状態をシミュレート
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      });

      render(
        <AppProviders>
          <TestApp />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-app')).toBeInTheDocument();
      });

      // オフラインモード表示
      expect(screen.getByText(/offline mode/i)).toBeInTheDocument();

      // オンライン復帰
      Object.defineProperty(navigator, 'onLine', {
        value: true,
      });

      window.dispatchEvent(new Event('online'));

      await waitFor(() => {
        expect(screen.queryByText(/offline mode/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Cross-Platform Compatibility', () => {
    it('異なるOS環境での動作確認', async () => {
      // macOS環境シミュレート
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      });

      render(
        <AppProviders>
          <TestApp />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-app')).toBeInTheDocument();
      });

      expect(screen.getByTestId('test-app')).toBeInTheDocument();

      // Windows環境シミュレート
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      });

      render(
        <AppProviders>
          <TestApp />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-app')).toBeInTheDocument();
      });

      expect(screen.getByTestId('test-app')).toBeInTheDocument();
    });

    it('レスポンシブ対応確認', async () => {
      // モバイルサイズシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      render(
        <AppProviders>
          <TestApp />
        </AppProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('test-app')).toBeInTheDocument();
      });

      // モバイル対応レイアウト
      const app = screen.getByTestId('test-app');
      expect(app).toHaveClass('mobile-layout');

      // デスクトップサイズに変更
      Object.defineProperty(window, 'innerWidth', { value: 1920 });
      Object.defineProperty(window, 'innerHeight', { value: 1080 });

      window.dispatchEvent(new Event('resize'));

      await waitFor(() => {
        expect(app).toHaveClass('desktop-layout');
      });
    });
  });

  describe('Full Application Lifecycle', () => {
    it('アプリケーション起動から終了までの完全フロー', async () => {
      // 起動フェーズ
      const { unmount } = render(
        <AppProviders enablePerformanceMonitoring={true}>
          <TestApp />
        </AppProviders>
      );

      // 初期化完了確認
      await waitFor(() => {
        expect(screen.getByTestId('test-app')).toBeInTheDocument();
      });

      // 基本機能動作確認
      expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
      expect(screen.getByRole('tabpanel')).toBeInTheDocument();

      // パフォーマンス監視動作
      const metrics = screen.getByTestId('performance-metrics');
      expect(metrics).toBeInTheDocument();

      // 正常終了
      await act(async () => {
        unmount();
      });

      // メモリリークやリソースリークがないことを確認
      expect(document.querySelectorAll('[data-testid]')).toHaveLength(0);
    });

    it('リソース競合時の調停機能', async () => {
      // 複数のリソース集約的操作を同時実行
      const promises = [
        preloadCriticalWidgets(),
        preloadSecondaryWidgets(),
        // 大量のDOMレンダリング
        new Promise(resolve => {
          for (let i = 0; i < 100; i++) {
            render(<div key={i}>Element {i}</div>).unmount();
          }
          resolve(undefined);
        }),
      ];

      const startTime = performance.now();
      await Promise.all(promises);
      const endTime = performance.now();

      // リソース競合が適切に調停され、合理的な時間で完了
      expect(endTime - startTime).toBeLessThan(2000); // 2秒以内
    });
  });
});