/**
 * FSD Widget Integration Tests - Phase 4
 * Widget層の統合テスト：複数のfeatureを組み合わせたwidgetの動作確認
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';

// Widget imports
import { LazyMascotView, LazySettingsPanel } from '@app/providers';
import { AppProviders } from '@app/providers';

// Mock feature modules
const mockAnimationStore = {
  getState: vi.fn().mockReturnValue({
    currentAnimation: null,
    isPlaying: false,
    queue: [],
    startAnimation: vi.fn(),
    stopAnimation: vi.fn(),
  }),
  subscribe: vi.fn().mockReturnValue(() => {}),
};

const mockVrmStore = {
  getState: vi.fn().mockReturnValue({
    isLoaded: false,
    currentModel: null,
    loadingState: 'idle',
    headOrientation: { yaw: 0, pitch: 0 },
    setLoadingState: vi.fn(),
    loadModel: vi.fn(),
  }),
  subscribe: vi.fn().mockReturnValue(() => {}),
};

const mockMouseFollowStore = {
  getState: vi.fn().mockReturnValue({
    isEnabled: true,
    currentPosition: { x: 0, y: 0 },
    sensitivity: 1.0,
    updateMousePosition: vi.fn(),
  }),
  subscribe: vi.fn().mockReturnValue(() => {}),
};

const mockSettingsStore = {
  getState: vi.fn().mockReturnValue({
    display: { theme: 'dark', opacity: 0.8 },
    chat: { apiKey: '', maxTokens: 1000 },
    animation: { speed: 1.0, enabled: true },
    updateSettings: vi.fn(),
  }),
  subscribe: vi.fn().mockReturnValue(() => {}),
};

const mockChatStore = {
  getState: vi.fn().mockReturnValue({
    messages: [],
    isTyping: false,
    addMessage: vi.fn(),
  }),
  subscribe: vi.fn().mockReturnValue(() => {}),
};

// Mock feature hooks
vi.mock('@features/animation', () => ({
  useAnimation: () => ({ store: mockAnimationStore }),
}));

vi.mock('@features/vrm-control', () => ({
  useVrmControl: () => ({ store: mockVrmStore }),
}));

vi.mock('@features/mouse-follow', () => ({
  useMouseFollow: () => ({ store: mockMouseFollowStore }),
}));

vi.mock('@features/settings', () => ({
  useSettings: () => ({ store: mockSettingsStore }),
}));

vi.mock('@features/chat', () => ({
  useChat: () => ({ store: mockChatStore }),
}));

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AppProviders enablePerformanceMonitoring={false}>
    {children}
  </AppProviders>
);

describe('FSD Widget Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('MascotView Widget Integration', () => {
    it('MascotViewが複数のfeatureを正しく統合する', async () => {
      render(
        <TestWrapper>
          <LazyMascotView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
      });

      // VRM制御feature連携確認
      expect(mockVrmStore.subscribe).toHaveBeenCalled();
      
      // アニメーションfeature連携確認
      expect(mockAnimationStore.subscribe).toHaveBeenCalled();
      
      // マウス追従feature連携確認
      expect(mockMouseFollowStore.subscribe).toHaveBeenCalled();
    });

    it('マウス移動がMascotViewを通じてVRMに反映される', async () => {
      render(
        <TestWrapper>
          <LazyMascotView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
      });

      // マウス移動イベントをシミュレート
      const mascotView = screen.getByTestId('mascot-view');
      
      await act(async () => {
        fireEvent.mouseMove(mascotView, {
          clientX: 100,
          clientY: 150,
        });
      });

      // マウス追従storeが更新される
      expect(mockMouseFollowStore.getState().updateMousePosition).toHaveBeenCalledWith({
        x: 100,
        y: 150,
      });
    });

    it('アニメーション開始がMascotViewでVisual Feedbackを提供する', async () => {
      // アニメーション再生中の状態にモック更新
      mockAnimationStore.getState.mockReturnValue({
        currentAnimation: {
          name: 'wave',
          duration: 2.0,
          priority: 'medium',
        },
        isPlaying: true,
        queue: [],
      });

      render(
        <TestWrapper>
          <LazyMascotView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
      });

      // アニメーション状態がUIに反映される
      expect(screen.getByTestId('animation-indicator')).toHaveClass('playing');
      expect(screen.getByText('wave')).toBeInTheDocument();
    });

    it('VRMロード状態がMascotViewに適切に表示される', async () => {
      // ローディング状態のモック
      mockVrmStore.getState.mockReturnValue({
        isLoaded: false,
        loadingState: 'loading',
        progress: 0.6,
      });

      render(
        <TestWrapper>
          <LazyMascotView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
      });

      // ローディング表示確認
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      expect(screen.getByText('60%')).toBeInTheDocument();
    });
  });

  describe('SettingsPanel Widget Integration', () => {
    it('SettingsPanelが全てのfeature設定を統合表示する', async () => {
      render(
        <TestWrapper>
          <LazySettingsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      // 全てのタブが表示される
      expect(screen.getByRole('tab', { name: /display/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /chat/i })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /animation/i })).toBeInTheDocument();
      
      // 設定値が正しく表示される
      expect(screen.getByDisplayValue('dark')).toBeInTheDocument();
      expect(screen.getByDisplayValue('0.8')).toBeInTheDocument();
    });

    it('設定変更が対応するfeatureに即座に反映される', async () => {
      render(
        <TestWrapper>
          <LazySettingsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      // テーマ変更
      const themeSelect = screen.getByDisplayValue('dark');
      
      await act(async () => {
        fireEvent.change(themeSelect, { target: { value: 'light' } });
      });

      // Settings storeが更新される
      expect(mockSettingsStore.getState().updateSettings).toHaveBeenCalledWith({
        display: { theme: 'light' }
      });
    });

    it('feature間の設定依存関係がSettingsPanelで正しく処理される', async () => {
      render(
        <TestWrapper>
          <LazySettingsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      // アニメーションタブに切り替え
      const animationTab = screen.getByRole('tab', { name: /animation/i });
      
      await act(async () => {
        fireEvent.click(animationTab);
      });

      // アニメーション無効化
      const animationToggle = screen.getByLabelText(/enable animations/i);
      
      await act(async () => {
        fireEvent.click(animationToggle);
      });

      // 依存するマウス追従設定も影響を受ける
      expect(mockSettingsStore.getState().updateSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          animation: { enabled: false },
          mouseFollow: { animationSupport: false }
        })
      );
    });

    it('設定のインポート/エクスポート機能', async () => {
      render(
        <TestWrapper>
          <LazySettingsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      // エクスポートボタンテスト
      const exportButton = screen.getByRole('button', { name: /export/i });
      
      await act(async () => {
        fireEvent.click(exportButton);
      });

      // 全feature設定が取得される
      expect(mockSettingsStore.getState).toHaveBeenCalled();

      // インポートファイル選択テスト
      const importInput = screen.getByLabelText(/import/i);
      const mockFile = new File(['{"settings":{}}'], 'settings.json', {
        type: 'application/json'
      });

      await act(async () => {
        fireEvent.change(importInput, { target: { files: [mockFile] } });
      });

      // 設定が復元される
      expect(mockSettingsStore.getState().updateSettings).toHaveBeenCalled();
    });
  });

  describe('Widget-Feature Performance Integration', () => {
    it('複数widgetの同時動作時のパフォーマンス', async () => {
      const startTime = performance.now();

      const { rerender } = render(
        <TestWrapper>
          <LazyMascotView />
          <LazySettingsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      // 大量の状態更新をシミュレート
      for (let i = 0; i < 100; i++) {
        await act(async () => {
          // Mock状態更新
          mockAnimationStore.getState.mockReturnValue({
            currentAnimation: { name: `anim-${i}` },
            isPlaying: i % 2 === 0,
          });
          
          mockVrmStore.getState.mockReturnValue({
            headOrientation: { yaw: i * 0.01, pitch: i * 0.01 },
          });
        });

        // 少量の再レンダリング
        rerender(
          <TestWrapper>
            <LazyMascotView />
            <LazySettingsPanel />
          </TestWrapper>
        );
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // パフォーマンス要件確認（500ms以下）
      expect(duration).toBeLessThan(500);
    });

    it('メモリ効率的なwidget管理', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0;

      // Widget マウント/アンマウントサイクル
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <TestWrapper>
            <LazyMascotView />
            <LazySettingsPanel />
          </TestWrapper>
        );

        await waitFor(() => {
          expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
        });

        unmount();
      }

      // ガベージコレクション待機
      await new Promise(resolve => setTimeout(resolve, 100));

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;

      // メモリリークが許容範囲内（5MB）
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });
  });

  describe('Widget Error Handling Integration', () => {
    it('Feature errorがWidget UIで適切にハンドリングされる', async () => {
      // VRMロードエラーをシミュレート
      mockVrmStore.getState.mockReturnValue({
        isLoaded: false,
        loadingState: 'error',
        error: new Error('Failed to load VRM model'),
      });

      render(
        <TestWrapper>
          <LazyMascotView />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
      });

      // エラー状態がUIに反映される
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/failed to load vrm model/i)).toBeInTheDocument();
      
      // フォールバック表示
      expect(screen.getByTestId('fallback-display')).toBeInTheDocument();
    });

    it('Widget lazy loading errorの適切な処理', async () => {
      // LazyLoad失敗をシミュレート
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      vi.doMock('@widgets/settings-panel', () => {
        throw new Error('Widget loading failed');
      });

      render(
        <TestWrapper>
          <LazySettingsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument();
      });

      // エラーフォールバックコンポーネント表示
      expect(screen.getByText(/loading error/i)).toBeInTheDocument();
      expect(screen.getByText(/failed to load component/i)).toBeInTheDocument();

      consoleError.mockRestore();
    });
  });

  describe('Widget Accessibility Integration', () => {
    it('全widgetがアクセシビリティ要件を満たす', async () => {
      render(
        <TestWrapper>
          <LazyMascotView />
          <LazySettingsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByTestId('mascot-view')).toBeInTheDocument();
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      // MascotView accessibility
      const mascotView = screen.getByTestId('mascot-view');
      expect(mascotView).toHaveAttribute('role', 'application');
      expect(mascotView).toHaveAttribute('aria-label');

      // SettingsPanel accessibility  
      const tablist = screen.getByRole('tablist');
      expect(tablist).toHaveAttribute('aria-label');
      
      const tabs = screen.getAllByRole('tab');
      tabs.forEach(tab => {
        expect(tab).toHaveAttribute('aria-controls');
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('キーボードナビゲーションがwidget間で動作する', async () => {
      render(
        <TestWrapper>
          <LazyMascotView />
          <LazySettingsPanel />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('tabpanel')).toBeInTheDocument();
      });

      const tablist = screen.getByRole('tablist');
      
      // Tab navigation
      await act(async () => {
        tablist.focus();
        fireEvent.keyDown(tablist, { key: 'ArrowRight' });
      });

      // フォーカスが移動する
      expect(document.activeElement).toBe(screen.getAllByRole('tab')[1]);
    });
  });
});