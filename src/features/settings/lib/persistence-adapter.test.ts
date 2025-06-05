/**
 * Settings Persistence Adapter Tests - FSD Phase 2
 * 設定永続化アダプターのテスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import type { AppSettings } from '../types';

import { SettingsPersistenceAdapter } from './persistence-adapter';

// Mock Electron API
const mockElectronAPI = {
  // General settings
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
  resetSystemPromptCore: vi.fn(),
  
  // Display settings
  getMainWindowBounds: vi.fn(),
  setMainWindowBounds: vi.fn(),
  getChatWindowBounds: vi.fn(),
  setChatWindowBounds: vi.fn(),
  getChatWindowVisible: vi.fn(),
  setChatWindowVisible: vi.fn(),
  getCameraSettings: vi.fn(),
  setCameraSettings: vi.fn(),
  resetAllDisplaySettings: vi.fn(),
  
  // Theme settings
  getTheme: vi.fn(),
  setTheme: vi.fn(),
  
  // Expression settings
  getExpressionSettings: vi.fn(),
  setExpressionSettings: vi.fn(),
  getDefaultExpression: vi.fn(),
  setDefaultExpression: vi.fn(),
  resetExpressionSettings: vi.fn()
};

// @ts-ignore - Mock window.electronAPI
global.window = { electronAPI: mockElectronAPI };

describe('SettingsPersistenceAdapter', () => {
  let adapter: SettingsPersistenceAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new SettingsPersistenceAdapter();
  });

  describe('loadAllSettings', () => {
    it('全ての設定を統合して読み込める', async () => {
      // Mock responses
      mockElectronAPI.getSettings.mockResolvedValue({
        chat: { apiProvider: 'gemini', apiKey: 'test-key' }
      });
      mockElectronAPI.getUserName.mockResolvedValue('TestUser');
      mockElectronAPI.getMascotName.mockResolvedValue('TestMascot');
      mockElectronAPI.getSystemPromptCore.mockResolvedValue('Test prompt');
      mockElectronAPI.getTheme.mockResolvedValue('dark');
      mockElectronAPI.getMainWindowBounds.mockResolvedValue({ x: 100, y: 200, width: 400, height: 600 });
      mockElectronAPI.getCameraSettings.mockResolvedValue({ fov: 45, position: { x: 0, y: 0, z: 5 } });
      mockElectronAPI.getExpressionSettings.mockResolvedValue({ happy: { enabled: true, weight: 0.8 } });
      mockElectronAPI.getDefaultExpression.mockResolvedValue('neutral');

      const settings = await adapter.loadAllSettings();

      expect(settings).toBeDefined();
      expect(settings.chat.apiProvider).toBe('gemini');
      expect(settings.chat.apiKey).toBe('test-key');
      expect(settings.chat.systemPrompt).toBe('Test prompt');
      expect(settings.display.windowWidth).toBe(400);
      expect(settings.display.windowHeight).toBe(600);
    });

    it('個別API失敗時にデフォルト値を使用する', async () => {
      mockElectronAPI.getSettings.mockResolvedValue({});
      mockElectronAPI.getUserName.mockRejectedValue(new Error('API Error'));
      mockElectronAPI.getMascotName.mockRejectedValue(new Error('API Error'));

      const settings = await adapter.loadAllSettings();

      expect(settings).toBeDefined();
      // デフォルト値が使用される
      expect(settings.chat.apiProvider).toBe('gemini');
    });
  });

  describe('saveAllSettings', () => {
    it('全ての設定を適切なAPIで保存できる', async () => {
      const settings: AppSettings = {
        chat: {
          apiProvider: 'gemini',
          apiKey: 'new-key',
          systemPrompt: 'New prompt',
          maxTokens: 2048,
          temperature: 0.7,
          saveHistory: true,
          maxHistoryItems: 100,
          showTimestamp: true,
          fontSize: 'medium',
          theme: 'dark'
        },
        display: {
          windowWidth: 500,
          windowHeight: 700,
          alwaysOnTop: true,
          windowOpacity: 0.9,
          defaultPosition: 'top-right',
          antialiasing: true,
          shadowQuality: 'high',
          fps: 60
        },
        expression: {
          enableAutoExpressions: true,
          expressionChangeInterval: 30,
          enableBlink: true,
          blinkIntervalMin: 3,
          blinkIntervalMax: 7,
          expressionIntensity: 0.8,
          customExpressions: {}
        },
        mouseFollow: {
          enabled: true,
          sensitivity: 0.6,
          smoothing: 0.8,
          deadZone: 30,
          updateFrequency: 16
        },
        vrm: {
          modelPath: '/path/to/model.vrm',
          animationPath: null,
          modelScale: 1.2,
          enablePhysics: true,
          physicsQuality: 'high',
          enableSpringBone: true,
          springBoneStiffness: 0.8,
          springBoneDamping: 0.2
        },
        audio: {
          enableTTS: false,
          ttsVoice: '',
          ttsSpeed: 1.0,
          ttsVolume: 0.8,
          enableSoundEffects: true,
          soundEffectsVolume: 0.5
        },
        version: '1.0.0',
        lastUpdated: Date.now()
      };

      // Mock successful saves
      mockElectronAPI.saveSettings.mockResolvedValue({ success: true });
      mockElectronAPI.setUserName.mockResolvedValue({ success: true });
      mockElectronAPI.setMascotName.mockResolvedValue({ success: true });
      mockElectronAPI.setSystemPromptCore.mockResolvedValue({ success: true });
      mockElectronAPI.setTheme.mockResolvedValue({ success: true });
      mockElectronAPI.setMainWindowBounds.mockResolvedValue({ success: true });
      mockElectronAPI.setCameraSettings.mockResolvedValue({ success: true });
      mockElectronAPI.setExpressionSettings.mockResolvedValue({ success: true });

      const result = await adapter.saveAllSettings(settings);

      expect(result).toBe(true);
      expect(mockElectronAPI.saveSettings).toHaveBeenCalledWith(settings);
      expect(mockElectronAPI.setTheme).toHaveBeenCalledWith('dark');
      expect(mockElectronAPI.setSystemPromptCore).toHaveBeenCalledWith('New prompt');
    });

    it('一部のAPI失敗時もfalseを返す', async () => {
      const settings = {
        chat: { theme: 'dark' }
      } as AppSettings;

      mockElectronAPI.saveSettings.mockResolvedValue({ success: true });
      mockElectronAPI.setTheme.mockRejectedValue(new Error('Save failed'));

      const result = await adapter.saveAllSettings(settings);

      expect(result).toBe(false);
    });
  });

  describe('loadCategorySettings', () => {
    it('チャットカテゴリの設定を読み込める', async () => {
      mockElectronAPI.getUserName.mockResolvedValue('TestUser');
      mockElectronAPI.getMascotName.mockResolvedValue('TestMascot');
      mockElectronAPI.getSystemPromptCore.mockResolvedValue('Test prompt');
      mockElectronAPI.getSettings.mockResolvedValue({
        chat: { apiProvider: 'openai', temperature: 0.5 }
      });

      const chatSettings = await adapter.loadCategorySettings('chat');

      expect(chatSettings).toBeDefined();
      expect(chatSettings.systemPrompt).toBe('Test prompt');
      expect(chatSettings.apiProvider).toBe('openai');
      expect(chatSettings.temperature).toBe(0.5);
    });

    it('表示カテゴリの設定を読み込める', async () => {
      mockElectronAPI.getMainWindowBounds.mockResolvedValue({
        x: 100, y: 200, width: 450, height: 650
      });
      mockElectronAPI.getCameraSettings.mockResolvedValue({
        fov: 50
      });
      mockElectronAPI.getTheme.mockResolvedValue('ocean');

      const displaySettings = await adapter.loadCategorySettings('display');

      expect(displaySettings).toBeDefined();
      expect(displaySettings.windowWidth).toBe(450);
      expect(displaySettings.windowHeight).toBe(650);
    });
  });

  describe('saveCategorySettings', () => {
    it('チャットカテゴリの設定を保存できる', async () => {
      const chatSettings = {
        apiProvider: 'anthropic' as const,
        apiKey: 'test-key',
        systemPrompt: 'New prompt',
        maxTokens: 3000,
        temperature: 0.8,
        saveHistory: false,
        maxHistoryItems: 50,
        showTimestamp: false,
        fontSize: 'large' as const,
        theme: 'forest' as const
      };

      mockElectronAPI.setUserName.mockResolvedValue({ success: true });
      mockElectronAPI.setMascotName.mockResolvedValue({ success: true });
      mockElectronAPI.setSystemPromptCore.mockResolvedValue({ success: true });
      mockElectronAPI.setTheme.mockResolvedValue({ success: true });

      const result = await adapter.saveCategorySettings('chat', chatSettings);

      expect(result).toBe(true);
      expect(mockElectronAPI.setSystemPromptCore).toHaveBeenCalledWith('New prompt');
      expect(mockElectronAPI.setTheme).toHaveBeenCalledWith('forest');
    });

    it('表示カテゴリの設定を保存できる', async () => {
      const displaySettings = {
        windowWidth: 600,
        windowHeight: 800,
        alwaysOnTop: false,
        windowOpacity: 0.95,
        defaultPosition: 'center' as const,
        antialiasing: false,
        shadowQuality: 'low' as const,
        fps: 30 as const
      };

      mockElectronAPI.setMainWindowBounds.mockResolvedValue({ success: true });
      mockElectronAPI.setCameraSettings.mockResolvedValue({ success: true });

      const result = await adapter.saveCategorySettings('display', displaySettings);

      expect(result).toBe(true);
      expect(mockElectronAPI.setMainWindowBounds).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 600,
          height: 800
        })
      );
    });
  });

  describe('resetSettings', () => {
    it('全ての設定をリセットできる', async () => {
      mockElectronAPI.resetSettings.mockResolvedValue({ success: true });

      const result = await adapter.resetSettings();

      expect(result).toBe(true);
      expect(mockElectronAPI.resetSettings).toHaveBeenCalled();
    });

    it('カテゴリ別にリセットできる', async () => {
      mockElectronAPI.resetSystemPromptCore.mockResolvedValue({ success: true });
      mockElectronAPI.setUserName.mockResolvedValue({ success: true });
      mockElectronAPI.setMascotName.mockResolvedValue({ success: true });

      const result = await adapter.resetSettings('chat');

      expect(result).toBe(true);
      expect(mockElectronAPI.resetSystemPromptCore).toHaveBeenCalled();
    });
  });

  describe('getSettingsMetadata', () => {
    it('設定のメタデータを取得できる', async () => {
      const metadata = await adapter.getSettingsMetadata();

      expect(metadata).toBeDefined();
      expect(metadata.version).toBeDefined();
      expect(metadata.categories).toContain('chat');
      expect(metadata.categories).toContain('display');
      expect(metadata.lastModified).toBeInstanceOf(Date);
    });
  });

  describe('validateSettingsIntegrity', () => {
    it('設定の整合性を検証できる', async () => {
      const settings: AppSettings = {
        chat: { apiProvider: 'gemini', apiKey: '', systemPrompt: '' } as any,
        display: { windowWidth: 400, windowHeight: 600 } as any,
        expression: {} as any,
        mouseFollow: {} as any,
        vrm: {} as any,
        audio: {} as any,
        version: '1.0.0',
        lastUpdated: Date.now()
      };

      const isValid = await adapter.validateSettingsIntegrity(settings);

      expect(isValid).toBe(true);
    });

    it('不正な設定を検出できる', async () => {
      const invalidSettings = {
        chat: null,
        display: undefined
      } as any;

      const isValid = await adapter.validateSettingsIntegrity(invalidSettings);

      expect(isValid).toBe(false);
    });
  });
});