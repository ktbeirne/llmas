/**
 * Mascot Integration Tests - FSD Phase 2
 * widgetレイヤーでのマウス追従機能統合テスト
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { MascotIntegration } from './mascot-integration';
import { eventBus } from '@shared/lib/app-event-bus';

// モック
vi.mock('@features/mouse-follow', () => ({
  initializeMouseFollow: vi.fn().mockResolvedValue({
    start: vi.fn().mockResolvedValue(true),
    stop: vi.fn().mockResolvedValue(undefined),
    dispose: vi.fn().mockResolvedValue(undefined),
    updateSettings: vi.fn()
  }),
  useMouseFollowStore: {
    getState: vi.fn().mockReturnValue({
      enabled: true,
      smoothedOrientation: null
    }),
    subscribe: vi.fn().mockReturnValue(() => {})
  }
}));

vi.mock('@features/vrm-control', () => ({
  VRMController: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    setHeadOrientation: vi.fn(),
    dispose: vi.fn()
  }))
}));

vi.mock('@shared/lib/app-event-bus', () => ({
  eventBus: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }
}));

describe('MascotIntegration', () => {
  let integration: MascotIntegration;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('初期化', () => {
    it('should initialize all features', async () => {
      integration = new MascotIntegration();
      await integration.initialize();
      
      const { initializeMouseFollow } = require('@features/mouse-follow');
      expect(initializeMouseFollow).toHaveBeenCalled();
    });

    it('should set up orientation sync', async () => {
      integration = new MascotIntegration();
      await integration.initialize();
      
      const { useMouseFollowStore } = require('@features/mouse-follow');
      expect(useMouseFollowStore.subscribe).toHaveBeenCalled();
    });

    it('should start mouse tracking if enabled', async () => {
      integration = new MascotIntegration();
      await integration.initialize();
      
      const { initializeMouseFollow } = require('@features/mouse-follow');
      const mockService = await initializeMouseFollow();
      expect(mockService.start).toHaveBeenCalled();
    });
  });

  describe('オリエンテーション同期', () => {
    it('should sync head orientation to VRM', async () => {
      const { useMouseFollowStore } = require('@features/mouse-follow');
      const { VRMController } = require('@features/vrm-control');
      
      let orientationCallback: any;
      (useMouseFollowStore.subscribe as Mock).mockImplementation((selector, callback) => {
        if (selector === undefined || typeof selector === 'function') {
          orientationCallback = callback;
        }
        return () => {};
      });

      integration = new MascotIntegration();
      await integration.initialize();
      
      const mockOrientation = { pitch: 0.5, yaw: 0.3, roll: 0 };
      const mockVRM = (VRMController as Mock).mock.results[0].value;
      
      // オリエンテーション変更をトリガー
      orientationCallback({ smoothedOrientation: mockOrientation });
      
      expect(mockVRM.setHeadOrientation).toHaveBeenCalledWith(mockOrientation);
    });

    it('should handle null orientation', async () => {
      const { useMouseFollowStore } = require('@features/mouse-follow');
      const { VRMController } = require('@features/vrm-control');
      
      let orientationCallback: any;
      (useMouseFollowStore.subscribe as Mock).mockImplementation((selector, callback) => {
        orientationCallback = callback;
        return () => {};
      });

      integration = new MascotIntegration();
      await integration.initialize();
      
      const mockVRM = (VRMController as Mock).mock.results[0].value;
      
      // null オリエンテーション
      orientationCallback({ smoothedOrientation: null });
      
      expect(mockVRM.setHeadOrientation).not.toHaveBeenCalled();
    });
  });

  describe('イベント処理', () => {
    beforeEach(async () => {
      integration = new MascotIntegration();
      await integration.initialize();
    });

    it('should emit events on orientation change', async () => {
      const { useMouseFollowStore } = require('@features/mouse-follow');
      
      let orientationCallback: any;
      (useMouseFollowStore.subscribe as Mock).mockImplementation((selector, callback) => {
        orientationCallback = callback;
        return () => {};
      });

      integration = new MascotIntegration();
      await integration.initialize();
      
      const mockOrientation = { pitch: 0.5, yaw: 0.3, roll: 0 };
      orientationCallback({ smoothedOrientation: mockOrientation });
      
      expect(eventBus.emit).toHaveBeenCalledWith('mascot:head-orientation-changed', mockOrientation);
    });
  });

  describe('設定更新', () => {
    it('should update mouse follow settings', async () => {
      integration = new MascotIntegration();
      await integration.initialize();
      
      const newSettings = { sensitivity: 0.8 };
      integration.updateMouseFollowSettings(newSettings);
      
      const { initializeMouseFollow } = require('@features/mouse-follow');
      const mockService = await initializeMouseFollow();
      expect(mockService.updateSettings).toHaveBeenCalledWith(newSettings);
    });
  });

  describe('破棄処理', () => {
    it('should dispose all resources', async () => {
      integration = new MascotIntegration();
      await integration.initialize();
      
      await integration.dispose();
      
      const { initializeMouseFollow } = require('@features/mouse-follow');
      const { VRMController } = require('@features/vrm-control');
      
      const mockService = await initializeMouseFollow();
      const mockVRM = (VRMController as Mock).mock.results[0].value;
      
      expect(mockService.dispose).toHaveBeenCalled();
      expect(mockVRM.dispose).toHaveBeenCalled();
    });
  });
});