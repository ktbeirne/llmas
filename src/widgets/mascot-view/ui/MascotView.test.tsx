/**
 * MascotView Widget Tests - FSD Phase 3
 * MascotView Widgetのテスト（TDD: RED Phase）
 */

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

import { MascotView } from './MascotView';

// Feature stores をモック
vi.mock('@features/mouse-follow', () => ({
  useMouseFollow: () => ({
    isEnabled: true,
    targetOrientation: { pitch: 0, yaw: 0 },
    enable: vi.fn(),
    disable: vi.fn(),
    getStats: vi.fn(() => ({ accuracy: 0.95 }))
  })
}));

vi.mock('@features/vrm-control', () => ({
  useVRMControl: () => ({
    vrm: null,
    isLoading: false,
    error: null,
    loadModel: vi.fn(),
    setHeadOrientation: vi.fn(),
    playAnimation: vi.fn()
  })
}));

vi.mock('@features/animation', () => ({
  useAnimation: () => ({
    store: {
      getState: vi.fn(() => ({
        currentAnimation: null,
        isPlaying: false
      })),
      subscribe: vi.fn(() => vi.fn())
    }
  })
}));

vi.mock('@features/chat', () => ({
  useChat: () => ({
    store: {
      getState: vi.fn(() => ({
        isLoading: false,
        isTyping: false
      })),
      subscribe: vi.fn(() => vi.fn())
    }
  })
}));

// Three.js関連をモック
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="threejs-canvas">{children}</div>
  )
}));

vi.mock('three', () => ({
  Scene: vi.fn(),
  PerspectiveCamera: vi.fn(),
  WebGLRenderer: vi.fn(),
  AmbientLight: vi.fn(),
  DirectionalLight: vi.fn()
}));

describe('MascotView Widget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('レンダリング', () => {
    it('Three.jsキャンバスが正しくレンダリングされる', () => {
      render(<MascotView />);
      
      expect(screen.getByTestId('threejs-canvas')).toBeInTheDocument();
    });

    it('ステータスオーバーレイが表示される', () => {
      render(<MascotView />);
      
      expect(screen.getByText(/Mouse Follow:/)).toBeInTheDocument();
      expect(screen.getByText(/Animation:/)).toBeInTheDocument();
    });

    it('マウス追従が有効な場合にONと表示される', () => {
      render(<MascotView />);
      
      expect(screen.getByText('Mouse Follow: ON')).toBeInTheDocument();
    });
  });

  describe('Feature統合', () => {
    it('マウス追従が無効な場合にOFFと表示される', () => {
      vi.mocked(require('@features/mouse-follow').useMouseFollow).mockReturnValue({
        isEnabled: false,
        targetOrientation: { pitch: 0, yaw: 0 },
        enable: vi.fn(),
        disable: vi.fn(),
        getStats: vi.fn(() => ({ accuracy: 0.95 }))
      });

      render(<MascotView />);
      
      expect(screen.getByText('Mouse Follow: OFF')).toBeInTheDocument();
    });

    it('アニメーション再生中の場合に名前が表示される', () => {
      vi.mocked(require('@features/animation').useAnimation).mockReturnValue({
        store: {
          getState: vi.fn(() => ({
            currentAnimation: { name: 'wave.vrma', category: 'gesture' },
            isPlaying: true
          })),
          subscribe: vi.fn(() => vi.fn())
        }
      });

      render(<MascotView />);
      
      expect(screen.getByText('Animation: wave.vrma')).toBeInTheDocument();
    });

    it('チャット読み込み中の場合にインジケーターが表示される', () => {
      vi.mocked(require('@features/chat').useChat).mockReturnValue({
        store: {
          getState: vi.fn(() => ({
            isLoading: true,
            isTyping: false
          })),
          subscribe: vi.fn(() => vi.fn())
        }
      });

      render(<MascotView />);
      
      expect(screen.getByText(/Loading/)).toBeInTheDocument();
    });

    it('VRMエラーがある場合にエラー表示される', () => {
      vi.mocked(require('@features/vrm-control').useVRMControl).mockReturnValue({
        vrm: null,
        isLoading: false,
        error: 'Model loading failed',
        loadModel: vi.fn(),
        setHeadOrientation: vi.fn(),
        playAnimation: vi.fn()
      });

      render(<MascotView />);
      
      expect(screen.getByText(/Error:/)).toBeInTheDocument();
      expect(screen.getByText(/Model loading failed/)).toBeInTheDocument();
    });
  });

  describe('パフォーマンス', () => {
    it('不要な再レンダリングが発生しない', async () => {
      const mockSubscribe = vi.fn(() => vi.fn());
      
      vi.mocked(require('@features/animation').useAnimation).mockReturnValue({
        store: {
          getState: vi.fn(() => ({
            currentAnimation: null,
            isPlaying: false
          })),
          subscribe: mockSubscribe
        }
      });

      render(<MascotView />);
      
      // subscribe が呼ばれることを確認（状態変更の監視）
      expect(mockSubscribe).toHaveBeenCalled();
    });
  });

  describe('クリーンアップ', () => {
    it('アンマウント時にリスナーが正しく解除される', () => {
      const mockUnsubscribe = vi.fn();
      
      vi.mocked(require('@features/animation').useAnimation).mockReturnValue({
        store: {
          getState: vi.fn(() => ({
            currentAnimation: null,
            isPlaying: false
          })),
          subscribe: vi.fn(() => mockUnsubscribe)
        }
      });

      const { unmount } = render(<MascotView />);
      unmount();
      
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});