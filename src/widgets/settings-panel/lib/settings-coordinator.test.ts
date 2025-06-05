/**
 * SettingsCoordinator Tests - FSD Phase 3
 * Settings Panel Widget の統合調整テスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { SettingsCoordinator } from './settings-coordinator';

// Feature settingsのモック
const mockSettingsStore = {
  getState: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {}),
  updateDisplaySettings: vi.fn(),
  updateChatSettings: vi.fn(),
  updateExpressionSettings: vi.fn(),
  updateCameraSettings: vi.fn(),
  updateDebugSettings: vi.fn(),
  exportSettings: vi.fn(),
  importSettings: vi.fn(),
  resetToDefaults: vi.fn()
};

const mockVrmStore = {
  getState: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {})
};

const mockChatStore = {
  getState: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {})
};

const mockMouseFollowStore = {
  getState: vi.fn(),
  subscribe: vi.fn().mockReturnValue(() => {})
};

vi.mock('@features/settings', () => ({
  useSettings: () => ({ store: mockSettingsStore })
}));

vi.mock('@features/vrm-control', () => ({
  useVrmControl: () => ({ store: mockVrmStore })
}));

vi.mock('@features/chat', () => ({
  useChat: () => ({ store: mockChatStore })
}));

vi.mock('@features/mouse-follow', () => ({
  useMouseFollow: () => ({ store: mockMouseFollowStore })
}));

describe('SettingsCoordinator', () => {
  let coordinator: SettingsCoordinator;

  beforeEach(() => {
    vi.clearAllMocks();
    coordinator = new SettingsCoordinator();
  });

  afterEach(() => {
    coordinator.destroy();
  });

  describe('初期化', () => {
    it('正常に初期化される', () => {
      expect(coordinator).toBeInstanceOf(SettingsCoordinator);
    });

    it('各Feature storeが購読される', () => {
      expect(mockSettingsStore.subscribe).toHaveBeenCalled();
      expect(mockVrmStore.subscribe).toHaveBeenCalled();
      expect(mockChatStore.subscribe).toHaveBeenCalled();
      expect(mockMouseFollowStore.subscribe).toHaveBeenCalled();
    });
  });

  describe('設定取得', () => {
    it('Display設定を取得できる', () => {
      const mockDisplaySettings = {
        theme: 'dark',
        opacity: 0.8,
        alwaysOnTop: true
      };

      mockSettingsStore.getState.mockReturnValue({
        display: mockDisplaySettings
      });

      const settings = coordinator.getDisplaySettings();
      expect(settings).toEqual(mockDisplaySettings);
    });

    it('Chat設定を取得できる', () => {
      const mockChatSettings = {
        apiKey: 'test-key',
        maxTokens: 1000,
        temperature: 0.7
      };

      mockSettingsStore.getState.mockReturnValue({
        chat: mockChatSettings
      });

      const settings = coordinator.getChatSettings();
      expect(settings).toEqual(mockChatSettings);
    });

    it('Expression設定を取得できる', () => {
      const mockExpressionSettings = {
        enableEmotions: true,
        intensityMultiplier: 1.2,
        transitionSpeed: 0.5
      };

      mockSettingsStore.getState.mockReturnValue({
        expression: mockExpressionSettings
      });

      const settings = coordinator.getExpressionSettings();
      expect(settings).toEqual(mockExpressionSettings);
    });

    it('Camera設定を取得できる', () => {
      const mockCameraSettings = {
        position: { x: 0, y: 0, z: 5 },
        target: { x: 0, y: 0, z: 0 },
        fov: 45
      };

      mockSettingsStore.getState.mockReturnValue({
        camera: mockCameraSettings
      });

      const settings = coordinator.getCameraSettings();
      expect(settings).toEqual(mockCameraSettings);
    });

    it('Debug設定を取得できる', () => {
      const mockDebugSettings = {
        enableLogging: true,
        logLevel: 'info',
        showFPS: false
      };

      mockSettingsStore.getState.mockReturnValue({
        debug: mockDebugSettings
      });

      const settings = coordinator.getDebugSettings();
      expect(settings).toEqual(mockDebugSettings);
    });
  });

  describe('設定更新', () => {
    it('Display設定を更新できる', async () => {
      const newSettings = {
        theme: 'light',
        opacity: 0.9
      };

      mockSettingsStore.updateDisplaySettings.mockResolvedValue(undefined);

      await coordinator.updateDisplaySettings(newSettings);

      expect(mockSettingsStore.updateDisplaySettings).toHaveBeenCalledWith(newSettings);
    });

    it('Chat設定を更新できる', async () => {
      const newSettings = {
        temperature: 0.8,
        maxTokens: 1500
      };

      mockSettingsStore.updateChatSettings.mockResolvedValue(undefined);

      await coordinator.updateChatSettings(newSettings);

      expect(mockSettingsStore.updateChatSettings).toHaveBeenCalledWith(newSettings);
    });

    it('Expression設定を更新できる', async () => {
      const newSettings = {
        enableEmotions: false,
        intensityMultiplier: 1.0
      };

      mockSettingsStore.updateExpressionSettings.mockResolvedValue(undefined);

      await coordinator.updateExpressionSettings(newSettings);

      expect(mockSettingsStore.updateExpressionSettings).toHaveBeenCalledWith(newSettings);
    });

    it('Camera設定を更新できる', async () => {
      const newSettings = {
        fov: 60
      };

      mockSettingsStore.updateCameraSettings.mockResolvedValue(undefined);

      await coordinator.updateCameraSettings(newSettings);

      expect(mockSettingsStore.updateCameraSettings).toHaveBeenCalledWith(newSettings);
    });

    it('Debug設定を更新できる', async () => {
      const newSettings = {
        logLevel: 'debug',
        showFPS: true
      };

      mockSettingsStore.updateDebugSettings.mockResolvedValue(undefined);

      await coordinator.updateDebugSettings(newSettings);

      expect(mockSettingsStore.updateDebugSettings).toHaveBeenCalledWith(newSettings);
    });
  });

  describe('設定変更監視', () => {
    it('設定変更を購読できる', () => {
      const callback = vi.fn();
      const unsubscribe = coordinator.subscribeToChanges(callback);

      // モックのsubscribeコールバックを実行
      const subscribeCall = mockSettingsStore.subscribe.mock.calls[0];
      const settingsCallback = subscribeCall[0];
      
      const newState = { display: { theme: 'dark' } };
      settingsCallback(newState);

      expect(callback).toHaveBeenCalledWith({
        type: 'settings',
        data: newState
      });

      unsubscribe();
    });

    it('VRM状態変更を監視できる', () => {
      const callback = vi.fn();
      coordinator.subscribeToChanges(callback);

      // VRM storeのsubscribeコールバックを実行
      const subscribeCall = mockVrmStore.subscribe.mock.calls[0];
      const vrmCallback = subscribeCall[0];
      
      const newState = { isLoaded: true, currentModel: 'test.vrm' };
      vrmCallback(newState);

      expect(callback).toHaveBeenCalledWith({
        type: 'vrm',
        data: newState
      });
    });

    it('購読解除が正常に動作する', () => {
      const callback = vi.fn();
      const unsubscribe = coordinator.subscribeToChanges(callback);

      unsubscribe();

      // 購読解除後は通知されない
      const subscribeCall = mockSettingsStore.subscribe.mock.calls[0];
      const settingsCallback = subscribeCall[0];
      settingsCallback({ display: { theme: 'light' } });

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('バルク操作', () => {
    it('全設定を取得できる', () => {
      const mockAllSettings = {
        display: { theme: 'dark' },
        chat: { apiKey: 'test' },
        expression: { enableEmotions: true },
        camera: { fov: 45 },
        debug: { enableLogging: false }
      };

      mockSettingsStore.getState.mockReturnValue(mockAllSettings);

      const allSettings = coordinator.getAllSettings();
      expect(allSettings).toEqual(mockAllSettings);
    });

    it('設定をエクスポートできる', async () => {
      const mockExportData = {
        version: '1.0.0',
        settings: { display: { theme: 'dark' } },
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      mockSettingsStore.exportSettings.mockResolvedValue(mockExportData);

      const exportData = await coordinator.exportSettings();
      expect(exportData).toEqual(mockExportData);
      expect(mockSettingsStore.exportSettings).toHaveBeenCalled();
    });

    it('設定をインポートできる', async () => {
      const importData = {
        version: '1.0.0',
        settings: { display: { theme: 'light' } },
        timestamp: '2024-01-01T00:00:00.000Z'
      };

      mockSettingsStore.importSettings.mockResolvedValue(undefined);

      await coordinator.importSettings(importData);
      expect(mockSettingsStore.importSettings).toHaveBeenCalledWith(importData);
    });

    it('設定をデフォルトにリセットできる', async () => {
      mockSettingsStore.resetToDefaults.mockResolvedValue(undefined);

      await coordinator.resetToDefaults();
      expect(mockSettingsStore.resetToDefaults).toHaveBeenCalled();
    });
  });

  describe('バリデーション', () => {
    it('設定の妥当性を検証できる', () => {
      const validSettings = {
        display: { theme: 'dark', opacity: 0.8 },
        chat: { temperature: 0.7 }
      };

      const result = coordinator.validateSettings(validSettings);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('無効な設定を検出できる', () => {
      const invalidSettings = {
        display: { theme: 'invalid-theme', opacity: 2.0 },
        chat: { temperature: -1 }
      };

      const result = coordinator.validateSettings(invalidSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('設定の型チェックを行える', () => {
      const wrongTypeSettings = {
        display: { opacity: 'invalid-number' },
        chat: { maxTokens: 'not-a-number' }
      };

      const result = coordinator.validateSettings(wrongTypeSettings);
      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('type'))).toBe(true);
    });
  });

  describe('パフォーマンス', () => {
    it('変更の検出が効率的に動作する', () => {
      const callback = vi.fn();
      coordinator.subscribeToChanges(callback);

      // 同じ設定で複数回更新しても重複通知されない
      const subscribeCall = mockSettingsStore.subscribe.mock.calls[0];
      const settingsCallback = subscribeCall[0];
      
      const sameState = { display: { theme: 'dark' } };
      settingsCallback(sameState);
      settingsCallback(sameState);

      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('大量の設定変更を効率的に処理できる', async () => {
      const updates = Array.from({ length: 100 }, (_, i) => ({
        display: { opacity: i / 100 }
      }));

      mockSettingsStore.updateDisplaySettings.mockResolvedValue(undefined);

      const startTime = Date.now();
      await Promise.all(
        updates.map(update => coordinator.updateDisplaySettings(update.display))
      );
      const endTime = Date.now();

      // 100回の更新が1秒未満で完了することを確認
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('クリーンアップ', () => {
    it('destroyで正常にクリーンアップされる', () => {
      const callback = vi.fn();
      coordinator.subscribeToChanges(callback);

      expect(() => coordinator.destroy()).not.toThrow();

      // 破棄後は状態変更通知が来ない
      const subscribeCall = mockSettingsStore.subscribe.mock.calls[0];
      const settingsCallback = subscribeCall[0];
      settingsCallback({ display: { theme: 'light' } });

      expect(callback).not.toHaveBeenCalled();
    });

    it('複数回destroyを呼んでもエラーが発生しない', () => {
      coordinator.destroy();
      expect(() => coordinator.destroy()).not.toThrow();
    });
  });
});