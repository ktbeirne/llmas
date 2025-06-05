/**
 * Settings Feature Public API Tests
 * 設定機能の公開APIテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  initializeSettings,
  saveAllSettings,
  getSettingsByCategory,
  subscribeToSettings,
  subscribeToCategory,
  resetSettings,
  exportSettings,
  importSettings,
  settingsStore
} from './index';

// Mock modules
vi.mock('./model/settings-store', () => ({
  settingsStore: {
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
    getState: vi.fn(() => ({
      settings: {
        chat: { apiProvider: 'gemini' },
        display: { windowWidth: 400 }
      }
    })),
    getSettingsByCategory: vi.fn((category) => {
      const settings = {
        chat: { apiProvider: 'gemini' },
        display: { windowWidth: 400 }
      };
      return settings[category];
    }),
    subscribe: vi.fn(),
    subscribeToCategory: vi.fn(),
    resetCategory: vi.fn(),
    resetToDefaults: vi.fn(),
    exportSettings: vi.fn(() => ({
      settings: {},
      exportedAt: Date.now(),
      appVersion: '1.0.0',
      platform: 'test'
    })),
    importSettings: vi.fn()
  }
}));

vi.mock('./lib/persistence-adapter', () => ({
  SettingsPersistenceAdapter: vi.fn().mockImplementation(() => ({
    loadAllSettings: vi.fn().mockResolvedValue({}),
    saveAllSettings: vi.fn().mockResolvedValue(true),
    resetSettings: vi.fn().mockResolvedValue(true)
  }))
}));

describe('Settings Feature Public API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initializeSettings', () => {
    it('設定を初期化できる', async () => {
      await initializeSettings();

      expect(settingsStore.loadSettings).toHaveBeenCalled();
    });
  });

  describe('saveAllSettings', () => {
    it('全ての設定を保存できる', async () => {
      settingsStore.saveSettings.mockResolvedValue(true);

      const result = await saveAllSettings();

      expect(result).toBe(true);
      expect(settingsStore.saveSettings).toHaveBeenCalled();
    });

    it('保存に失敗した場合falseを返す', async () => {
      settingsStore.saveSettings.mockResolvedValue(false);

      const result = await saveAllSettings();

      expect(result).toBe(false);
    });
  });

  describe('getSettingsByCategory', () => {
    it('カテゴリ別の設定を取得できる', () => {
      const chatSettings = getSettingsByCategory('chat');

      expect(chatSettings).toEqual({ apiProvider: 'gemini' });
      expect(settingsStore.getSettingsByCategory).toHaveBeenCalledWith('chat');
    });
  });

  describe('subscribeToSettings', () => {
    it('設定変更を購読できる', () => {
      const callback = vi.fn();
      const unsubscribe = vi.fn();
      settingsStore.subscribe.mockReturnValue(unsubscribe);

      const result = subscribeToSettings(callback);

      expect(settingsStore.subscribe).toHaveBeenCalledWith(callback);
      expect(result).toBe(unsubscribe);
    });
  });

  describe('subscribeToCategory', () => {
    it('カテゴリ別の設定変更を購読できる', () => {
      const callback = vi.fn();
      const unsubscribe = vi.fn();
      settingsStore.subscribeToCategory.mockReturnValue(unsubscribe);

      const result = subscribeToCategory('chat', callback);

      expect(settingsStore.subscribeToCategory).toHaveBeenCalledWith('chat', callback);
      expect(result).toBe(unsubscribe);
    });
  });

  describe('resetSettings', () => {
    it('全設定をリセットできる', async () => {
      await resetSettings();

      expect(settingsStore.resetToDefaults).toHaveBeenCalled();
    });

    it('カテゴリ別にリセットできる', async () => {
      await resetSettings('chat');

      expect(settingsStore.resetCategory).toHaveBeenCalledWith('chat');
    });
  });

  describe('exportSettings', () => {
    it('設定をエクスポートできる', () => {
      const exportData = exportSettings();

      expect(exportData).toHaveProperty('settings');
      expect(exportData).toHaveProperty('exportedAt');
      expect(exportData).toHaveProperty('appVersion');
      expect(settingsStore.exportSettings).toHaveBeenCalled();
    });
  });

  describe('importSettings', () => {
    it('設定をインポートできる', async () => {
      settingsStore.importSettings.mockResolvedValue(true);
      settingsStore.saveSettings.mockResolvedValue(true);

      const importData = {
        settings: {} as any,
        exportedAt: Date.now(),
        appVersion: '1.0.0',
        platform: 'test'
      };

      const result = await importSettings(importData);

      expect(result).toBe(true);
      expect(settingsStore.importSettings).toHaveBeenCalledWith(importData);
      expect(settingsStore.saveSettings).toHaveBeenCalled();
    });

    it('インポートに失敗した場合は保存しない', async () => {
      settingsStore.importSettings.mockResolvedValue(false);

      const importData = {
        settings: {} as any,
        exportedAt: Date.now(),
        appVersion: '1.0.0',
        platform: 'test'
      };

      const result = await importSettings(importData);

      expect(result).toBe(false);
      expect(settingsStore.saveSettings).not.toHaveBeenCalled();
    });
  });
});