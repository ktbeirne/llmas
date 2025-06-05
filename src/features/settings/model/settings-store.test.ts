/**
 * Settings Store Tests - FSD Phase 2
 * 設定ストアのテスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type {
  AppSettings,
  ChatSettings,
  DisplaySettings,
  MouseFollowSettings
} from '../types';

import { settingsStore } from './settings-store';

// Mock Electron API
const mockElectronAPI = {
  getSettings: vi.fn(),
  saveSettings: vi.fn(),
  resetSettings: vi.fn(),
  // Chat settings
  getUserName: vi.fn(),
  setUserName: vi.fn(),
  getMascotName: vi.fn(),
  setMascotName: vi.fn(),
  getSystemPromptCore: vi.fn(),
  setSystemPromptCore: vi.fn(),
  // Display settings
  getMainWindowBounds: vi.fn(),
  setMainWindowBounds: vi.fn(),
  // Theme
  getTheme: vi.fn(),
  setTheme: vi.fn(),
};

// @ts-ignore - Mock window.electronAPI
global.window = { electronAPI: mockElectronAPI };

describe('Settings Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStore.reset();
  });

  describe('初期化', () => {
    it('デフォルト設定で初期化される', () => {
      const state = settingsStore.getState();
      
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.settings).toBeDefined();
      expect(state.settings.chat).toBeDefined();
      expect(state.settings.display).toBeDefined();
      expect(state.settings.mouseFollow).toBeDefined();
    });
  });

  describe('設定の読み込み', () => {
    it('Electron APIから設定を読み込める', async () => {
      const mockSettings: Partial<AppSettings> = {
        chat: {
          apiProvider: 'gemini',
          apiKey: 'test-key',
          systemPrompt: 'Test prompt',
          maxTokens: 1000,
          temperature: 0.7,
          saveHistory: true,
          maxHistoryItems: 100,
          showTimestamp: true,
          fontSize: 'medium',
          theme: 'light'
        }
      };

      mockElectronAPI.getSettings.mockResolvedValue(mockSettings);
      mockElectronAPI.getUserName.mockResolvedValue('TestUser');
      mockElectronAPI.getMascotName.mockResolvedValue('TestMascot');

      await settingsStore.loadSettings();

      const state = settingsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.settings.chat.apiProvider).toBe('gemini');
      expect(state.settings.chat.apiKey).toBe('test-key');
    });

    it('読み込みエラーを適切に処理する', async () => {
      const error = new Error('Failed to load settings');
      mockElectronAPI.getSettings.mockRejectedValue(error);

      await settingsStore.loadSettings();

      const state = settingsStore.getState();
      expect(state.isLoading).toBe(false);
      expect(state.error).toBe('Failed to load settings');
    });

    it('読み込み中の状態を管理する', async () => {
      let resolveFn: (value: any) => void;
      const promise = new Promise((resolve) => {
        resolveFn = resolve;
      });
      mockElectronAPI.getSettings.mockReturnValue(promise);

      const loadPromise = settingsStore.loadSettings();
      
      // 読み込み中
      expect(settingsStore.getState().isLoading).toBe(true);
      
      // 読み込み完了
      resolveFn!({});
      await loadPromise;
      
      expect(settingsStore.getState().isLoading).toBe(false);
    });
  });

  describe('設定の保存', () => {
    it('現在の設定を保存できる', async () => {
      mockElectronAPI.saveSettings.mockResolvedValue({ success: true });

      const result = await settingsStore.saveSettings();

      expect(result).toBe(true);
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({
          chat: expect.any(Object),
          display: expect.any(Object),
          mouseFollow: expect.any(Object)
        })
      );
    });

    it('保存エラーを適切に処理する', async () => {
      mockElectronAPI.saveSettings.mockRejectedValue(new Error('Save failed'));

      const result = await settingsStore.saveSettings();

      expect(result).toBe(false);
      expect(settingsStore.getState().error).toBe('Failed to save settings');
    });
  });

  describe('個別設定の更新', () => {
    it('チャット設定を更新できる', async () => {
      const newChatSettings: Partial<ChatSettings> = {
        apiKey: 'new-key',
        temperature: 0.8
      };

      await settingsStore.updateChatSettings(newChatSettings);

      const state = settingsStore.getState();
      expect(state.settings.chat.apiKey).toBe('new-key');
      expect(state.settings.chat.temperature).toBe(0.8);
    });

    it('表示設定を更新できる', async () => {
      const newDisplaySettings: Partial<DisplaySettings> = {
        windowWidth: 500,
        windowHeight: 700,
        alwaysOnTop: true
      };

      await settingsStore.updateDisplaySettings(newDisplaySettings);

      const state = settingsStore.getState();
      expect(state.settings.display.windowWidth).toBe(500);
      expect(state.settings.display.windowHeight).toBe(700);
      expect(state.settings.display.alwaysOnTop).toBe(true);
    });

    it('マウス追従設定を更新できる', async () => {
      const newMouseSettings: Partial<MouseFollowSettings> = {
        enabled: true,
        sensitivity: 0.8,
        smoothing: 0.6
      };

      await settingsStore.updateMouseFollowSettings(newMouseSettings);

      const state = settingsStore.getState();
      expect(state.settings.mouseFollow.enabled).toBe(true);
      expect(state.settings.mouseFollow.sensitivity).toBe(0.8);
      expect(state.settings.mouseFollow.smoothing).toBe(0.6);
    });
  });

  describe('カテゴリ別設定の取得', () => {
    it('特定カテゴリの設定を取得できる', () => {
      const chatSettings = settingsStore.getSettingsByCategory('chat');
      expect(chatSettings).toBeDefined();
      expect(chatSettings).toHaveProperty('apiProvider');

      const displaySettings = settingsStore.getSettingsByCategory('display');
      expect(displaySettings).toBeDefined();
      expect(displaySettings).toHaveProperty('windowWidth');
    });
  });

  describe('設定のバリデーション', () => {
    it('無効なチャット設定を検証できる', () => {
      const invalidSettings: Partial<ChatSettings> = {
        maxTokens: -100,
        temperature: 2.5, // 範囲外
        maxHistoryItems: 0
      };

      const errors = settingsStore.validateChatSettings(invalidSettings);

      expect(errors).toHaveLength(3);
      expect(errors[0].key).toBe('maxTokens');
      expect(errors[1].key).toBe('temperature');
      expect(errors[2].key).toBe('maxHistoryItems');
    });

    it('無効な表示設定を検証できる', () => {
      const invalidSettings: Partial<DisplaySettings> = {
        windowWidth: 50, // 最小値以下
        windowHeight: 10000, // 最大値以上
        windowOpacity: 2.0 // 範囲外
      };

      const errors = settingsStore.validateDisplaySettings(invalidSettings);

      expect(errors).toHaveLength(3);
      expect(errors[0].key).toBe('windowWidth');
      expect(errors[1].key).toBe('windowHeight');
      expect(errors[2].key).toBe('windowOpacity');
    });

    it('有効な設定は検証を通過する', () => {
      const validSettings: Partial<ChatSettings> = {
        maxTokens: 1000,
        temperature: 0.7,
        maxHistoryItems: 50
      };

      const errors = settingsStore.validateChatSettings(validSettings);

      expect(errors).toHaveLength(0);
    });
  });

  describe('設定のリセット', () => {
    it('設定をデフォルト値にリセットできる', async () => {
      // まず設定を変更
      await settingsStore.updateChatSettings({ apiKey: 'test-key' });
      
      mockElectronAPI.resetSettings.mockResolvedValue({ success: true });

      // リセット
      await settingsStore.resetToDefaults();

      const state = settingsStore.getState();
      expect(state.settings).toEqual(settingsStore.getDefaultSettings());
      expect(mockElectronAPI.resetSettings).toHaveBeenCalled();
    });

    it('カテゴリ別にリセットできる', async () => {
      // チャット設定を変更
      await settingsStore.updateChatSettings({ 
        apiKey: 'test-key',
        temperature: 0.9 
      });

      // チャット設定のみリセット
      await settingsStore.resetCategory('chat');

      const state = settingsStore.getState();
      const defaultSettings = settingsStore.getDefaultSettings();
      expect(state.settings.chat).toEqual(defaultSettings.chat);
    });
  });

  describe('設定変更の購読', () => {
    it('設定変更を購読できる', async () => {
      const callback = vi.fn();
      const unsubscribe = settingsStore.subscribe(callback);

      await settingsStore.updateChatSettings({ apiKey: 'new-key' });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          settings: expect.objectContaining({
            chat: expect.objectContaining({
              apiKey: 'new-key'
            })
          })
        })
      );

      unsubscribe();
    });

    it('特定カテゴリの変更のみ購読できる', async () => {
      const chatCallback = vi.fn();
      const displayCallback = vi.fn();

      const unsubChat = settingsStore.subscribeToCategory('chat', chatCallback);
      const unsubDisplay = settingsStore.subscribeToCategory('display', displayCallback);

      // チャット設定を変更
      await settingsStore.updateChatSettings({ apiKey: 'new-key' });

      expect(chatCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'new-key'
        })
      );
      expect(displayCallback).not.toHaveBeenCalled();

      // 表示設定を変更
      await settingsStore.updateDisplaySettings({ windowWidth: 600 });

      expect(displayCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          windowWidth: 600
        })
      );
      expect(chatCallback).toHaveBeenCalledTimes(1); // 前回の呼び出しのみ

      unsubChat();
      unsubDisplay();
    });
  });

  describe('設定のエクスポート/インポート', () => {
    it('設定をエクスポートできる', () => {
      const exportData = settingsStore.exportSettings();

      expect(exportData).toHaveProperty('settings');
      expect(exportData).toHaveProperty('exportedAt');
      expect(exportData).toHaveProperty('appVersion');
      expect(exportData).toHaveProperty('platform');
      expect(exportData.settings).toEqual(settingsStore.getState().settings);
    });

    it('設定をインポートできる', async () => {
      const importData = {
        settings: {
          ...settingsStore.getDefaultSettings(),
          chat: {
            ...settingsStore.getDefaultSettings().chat,
            apiKey: 'imported-key',
            temperature: 0.5
          }
        },
        exportedAt: Date.now(),
        appVersion: '1.0.0',
        platform: 'darwin'
      };

      const result = await settingsStore.importSettings(importData);

      expect(result).toBe(true);
      const state = settingsStore.getState();
      expect(state.settings.chat.apiKey).toBe('imported-key');
      expect(state.settings.chat.temperature).toBe(0.5);
    });

    it('無効なインポートデータを拒否する', async () => {
      const invalidData = {
        settings: {
          chat: {
            temperature: 3.0 // 無効な値
          }
        }
      };

      const result = await settingsStore.importSettings(invalidData as any);

      expect(result).toBe(false);
      expect(settingsStore.getState().error).toContain('Invalid import data');
    });
  });

  describe('設定の差分検出', () => {
    it('設定の変更を検出できる', async () => {
      await settingsStore.updateChatSettings({ apiKey: 'new-key' });

      const hasChanges = settingsStore.hasUnsavedChanges();
      expect(hasChanges).toBe(true);

      const changes = settingsStore.getChangedCategories();
      expect(changes).toContain('chat');
      expect(changes).not.toContain('display');
    });

    it('保存後は変更なし状態になる', async () => {
      await settingsStore.updateChatSettings({ apiKey: 'new-key' });
      expect(settingsStore.hasUnsavedChanges()).toBe(true);

      mockElectronAPI.saveSettings.mockResolvedValue({ success: true });
      await settingsStore.saveSettings();

      expect(settingsStore.hasUnsavedChanges()).toBe(false);
      expect(settingsStore.getChangedCategories()).toHaveLength(0);
    });
  });
});