/**
 * Mouse Follow Store Tests - FSD Phase 2
 * TDDアプローチでマウス追従ストアをテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useMouseFollowStore } from './mouse-follow-store';

// モック
vi.mock('@shared/lib/app-event-bus', () => ({
  eventBus: {
    emit: vi.fn()
  }
}));

describe('MouseFollowStore', () => {
  beforeEach(() => {
    // ストアをリセット
    useMouseFollowStore.setState({
      enabled: true,
      sensitivity: 0.5,
      smoothing: 0.8,
      deadZone: 50,
      updateFrequency: 16,
      isTracking: false,
      currentPosition: null,
      targetOrientation: null,
      smoothedOrientation: null,
      hasPermission: false,
      permissionError: null
    });
    vi.clearAllMocks();
  });

  describe('設定管理', () => {
    it('should update settings', () => {
      const { updateSettings } = useMouseFollowStore.getState();
      
      updateSettings({
        sensitivity: 0.7,
        smoothing: 0.9
      });
      
      const state = useMouseFollowStore.getState();
      expect(state.sensitivity).toBe(0.7);
      expect(state.smoothing).toBe(0.9);
    });

    it('should emit settings changed event', () => {
      const { eventBus } = require('@shared/lib/app-event-bus');
      const { updateSettings } = useMouseFollowStore.getState();
      
      updateSettings({ sensitivity: 0.3 });
      
      expect(eventBus.emit).toHaveBeenCalledWith('settings:changed', {
        category: 'mouse-follow',
        key: 'bulk',
        value: { sensitivity: 0.3 }
      });
    });
  });

  describe('トラッキング制御', () => {
    it('should start tracking when enabled', () => {
      const { startTracking } = useMouseFollowStore.getState();
      
      startTracking();
      
      const state = useMouseFollowStore.getState();
      expect(state.isTracking).toBe(true);
    });

    it('should not start tracking when disabled', () => {
      useMouseFollowStore.setState({ enabled: false });
      const { startTracking } = useMouseFollowStore.getState();
      
      startTracking();
      
      const state = useMouseFollowStore.getState();
      expect(state.isTracking).toBe(false);
    });

    it('should stop tracking', () => {
      useMouseFollowStore.setState({ isTracking: true });
      const { stopTracking } = useMouseFollowStore.getState();
      
      stopTracking();
      
      const state = useMouseFollowStore.getState();
      expect(state.isTracking).toBe(false);
    });
  });

  describe('マウス位置更新', () => {
    it('should update mouse position', () => {
      const { updateMousePosition } = useMouseFollowStore.getState();
      const position = { x: 100, y: 200, timestamp: Date.now() };
      
      updateMousePosition(position);
      
      const state = useMouseFollowStore.getState();
      expect(state.currentPosition).toEqual(position);
    });

    it('should not update position when disabled', () => {
      useMouseFollowStore.setState({ enabled: false });
      const { updateMousePosition } = useMouseFollowStore.getState();
      
      updateMousePosition({ x: 100, y: 200, timestamp: Date.now() });
      
      const state = useMouseFollowStore.getState();
      expect(state.currentPosition).toBeNull();
    });

    it('should emit position changed event', () => {
      const { eventBus } = require('@shared/lib/app-event-bus');
      const { updateMousePosition } = useMouseFollowStore.getState();
      const position = { x: 100, y: 200, timestamp: Date.now() };
      
      updateMousePosition(position);
      
      expect(eventBus.emit).toHaveBeenCalledWith(
        'mouse-follow:position-changed',
        position
      );
    });
  });

  describe('権限管理', () => {
    it('should set permission granted', () => {
      const { setPermission } = useMouseFollowStore.getState();
      
      setPermission(true);
      
      const state = useMouseFollowStore.getState();
      expect(state.hasPermission).toBe(true);
      expect(state.permissionError).toBeNull();
    });

    it('should set permission denied with error', () => {
      const { setPermission } = useMouseFollowStore.getState();
      
      setPermission(false, 'Access denied');
      
      const state = useMouseFollowStore.getState();
      expect(state.hasPermission).toBe(false);
      expect(state.permissionError).toBe('Access denied');
    });
  });

  describe('トグル機能', () => {
    it('should toggle enabled state', () => {
      const { toggle } = useMouseFollowStore.getState();
      
      toggle();
      expect(useMouseFollowStore.getState().enabled).toBe(false);
      
      toggle();
      expect(useMouseFollowStore.getState().enabled).toBe(true);
    });

    it('should emit enabled event when toggled', () => {
      const { eventBus } = require('@shared/lib/app-event-bus');
      const { toggle } = useMouseFollowStore.getState();
      
      toggle();
      
      expect(eventBus.emit).toHaveBeenCalledWith('mouse-follow:enabled', {
        enabled: false
      });
    });

    it('should stop tracking when disabled', () => {
      useMouseFollowStore.setState({ isTracking: true });
      const { toggle } = useMouseFollowStore.getState();
      
      toggle(); // disable
      
      const state = useMouseFollowStore.getState();
      expect(state.enabled).toBe(false);
      expect(state.isTracking).toBe(false);
    });
  });
});