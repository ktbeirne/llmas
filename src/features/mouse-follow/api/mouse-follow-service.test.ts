/**
 * Mouse Follow Service Tests - FSD Phase 2
 * マウス追従機能の統合サービステスト
 */

import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { eventBus } from '@shared/lib/app-event-bus';

import { useMouseFollowStore } from '../model/mouse-follow-store';

import { MouseFollowService } from './mouse-follow-service';

// モック
vi.mock('../model/mouse-follow-store');
vi.mock('./screen-adapter', () => ({
  ScreenAdapter: vi.fn().mockImplementation(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    checkPermission: vi.fn().mockResolvedValue(true),
    getMousePosition: vi.fn().mockReturnValue({ x: 100, y: 200, timestamp: Date.now() }),
    getScreenBounds: vi.fn().mockReturnValue({ width: 1920, height: 1080, x: 0, y: 0 })
  }))
}));

vi.mock('@shared/lib/app-event-bus', () => ({
  eventBus: {
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn()
  }
}));

describe('MouseFollowService', () => {
  let service: MouseFollowService;
  let storeMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // ストアのモック設定
    storeMock = {
      enabled: true,
      isTracking: false,
      hasPermission: false,
      updateFrequency: 16,
      setPermission: vi.fn(),
      startTracking: vi.fn(),
      stopTracking: vi.fn(),
      updateMousePosition: vi.fn(),
      updateSettings: vi.fn(),
      toggle: vi.fn(),
      reset: vi.fn()
    };
    
    (useMouseFollowStore.getState as Mock).mockReturnValue(storeMock);
    (useMouseFollowStore.subscribe as Mock).mockReturnValue(() => {});
  });

  afterEach(async () => {
    if (service) {
      await service.dispose();
    }
  });

  describe('初期化', () => {
    it('should initialize successfully', async () => {
      service = new MouseFollowService();
      await service.initialize();
      
      expect(storeMock.setPermission).toHaveBeenCalledWith(true);
    });

    it('should handle permission error', async () => {
      const ScreenAdapterMock = require('./screen-adapter').ScreenAdapter;
      ScreenAdapterMock.mockImplementation(() => ({
        initialize: vi.fn().mockRejectedValue(new Error('Permission denied')),
        checkPermission: vi.fn().mockResolvedValue(false)
      }));
      
      service = new MouseFollowService();
      await service.initialize();
      
      expect(storeMock.setPermission).toHaveBeenCalledWith(false, 'Permission denied');
    });

    it('should set up event listeners', async () => {
      service = new MouseFollowService();
      await service.initialize();
      
      expect(eventBus.on).toHaveBeenCalledWith('mouse-follow:start', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('mouse-follow:stop', expect.any(Function));
      expect(eventBus.on).toHaveBeenCalledWith('mouse-follow:toggle', expect.any(Function));
    });
  });

  describe('トラッキング制御', () => {
    beforeEach(async () => {
      service = new MouseFollowService();
      await service.initialize();
    });

    it('should start tracking', async () => {
      storeMock.hasPermission = true;
      
      const result = await service.start();
      
      expect(result).toBe(true);
      expect(storeMock.startTracking).toHaveBeenCalled();
    });

    it('should not start tracking without permission', async () => {
      storeMock.hasPermission = false;
      
      const result = await service.start();
      
      expect(result).toBe(false);
      expect(storeMock.startTracking).not.toHaveBeenCalled();
    });

    it('should stop tracking', async () => {
      await service.stop();
      
      expect(storeMock.stopTracking).toHaveBeenCalled();
    });

    it('should track mouse positions periodically', async () => {
      vi.useFakeTimers();
      storeMock.hasPermission = true;
      storeMock.enabled = true;
      
      await service.start();
      storeMock.isTracking = true;
      
      // 複数回のインターバルを進める
      vi.advanceTimersByTime(100);
      
      expect(storeMock.updateMousePosition).toHaveBeenCalled();
      
      vi.useRealTimers();
    });
  });

  describe('設定更新', () => {
    beforeEach(async () => {
      service = new MouseFollowService();
      await service.initialize();
    });

    it('should update settings', () => {
      const newSettings = { sensitivity: 0.8, smoothing: 0.5 };
      
      service.updateSettings(newSettings);
      
      expect(storeMock.updateSettings).toHaveBeenCalledWith(newSettings);
    });

    it('should restart tracking when updateFrequency changes', async () => {
      storeMock.isTracking = true;
      storeMock.hasPermission = true;
      
      service.updateSettings({ updateFrequency: 32 });
      
      expect(storeMock.stopTracking).toHaveBeenCalled();
      expect(storeMock.startTracking).toHaveBeenCalled();
    });
  });

  describe('権限管理', () => {
    beforeEach(async () => {
      service = new MouseFollowService();
      await service.initialize();
    });

    it('should check permission', async () => {
      const hasPermission = await service.checkPermission();
      
      expect(hasPermission).toBe(true);
    });

    it('should request permission', async () => {
      const ScreenAdapterMock = require('./screen-adapter').ScreenAdapter;
      const mockAdapter = {
        requestPermission: vi.fn().mockResolvedValue(true),
        checkPermission: vi.fn().mockResolvedValue(true)
      };
      ScreenAdapterMock.mockImplementation(() => mockAdapter);
      
      service = new MouseFollowService();
      const result = await service.requestPermission();
      
      expect(result).toBe(true);
      expect(mockAdapter.requestPermission).toHaveBeenCalled();
    });
  });

  describe('イベント処理', () => {
    beforeEach(async () => {
      service = new MouseFollowService();
      await service.initialize();
    });

    it('should handle start event', () => {
      const startHandler = (eventBus.on as Mock).mock.calls
        .find(call => call[0] === 'mouse-follow:start')?.[1];
      
      startHandler?.();
      
      expect(storeMock.startTracking).toHaveBeenCalled();
    });

    it('should handle stop event', () => {
      const stopHandler = (eventBus.on as Mock).mock.calls
        .find(call => call[0] === 'mouse-follow:stop')?.[1];
      
      stopHandler?.();
      
      expect(storeMock.stopTracking).toHaveBeenCalled();
    });

    it('should handle toggle event', () => {
      const toggleHandler = (eventBus.on as Mock).mock.calls
        .find(call => call[0] === 'mouse-follow:toggle')?.[1];
      
      toggleHandler?.();
      
      expect(storeMock.toggle).toHaveBeenCalled();
    });
  });

  describe('破棄処理', () => {
    it('should dispose resources', async () => {
      service = new MouseFollowService();
      await service.initialize();
      
      await service.dispose();
      
      expect(storeMock.stopTracking).toHaveBeenCalled();
      expect(storeMock.reset).toHaveBeenCalled();
      expect(eventBus.off).toHaveBeenCalledTimes(3);
    });

    it('should clear tracking interval on dispose', async () => {
      vi.useFakeTimers();
      service = new MouseFollowService();
      await service.initialize();
      storeMock.hasPermission = true;
      
      await service.start();
      await service.dispose();
      
      // インターバルが進んでも更新されないことを確認
      const callCount = storeMock.updateMousePosition.mock.calls.length;
      vi.advanceTimersByTime(100);
      expect(storeMock.updateMousePosition).toHaveBeenCalledTimes(callCount);
      
      vi.useRealTimers();
    });
  });
});