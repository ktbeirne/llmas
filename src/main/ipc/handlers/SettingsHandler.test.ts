/**
 * SettingsHandler の統合テスト
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { IpcMainInvokeEvent } from 'electron';

import { SettingsStore } from '../../../utils/settingsStore';
import { WindowManagerController } from '../../windows/WindowManagerController';

import { SettingsHandler } from './SettingsHandler';


// Electronモジュールのモック
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  },
  dialog: {
    showOpenDialog: vi.fn()
  }
}));

// 依存関係のモック
vi.mock('../../../utils/settingsStore');
vi.mock('../../windows/WindowManagerController');

describe('SettingsHandler', () => {
  let settingsHandler: SettingsHandler;
  let mockSettingsStore: vi.Mocked<SettingsStore>;
  let mockWindowManagerController: vi.Mocked<WindowManagerController>;
  let mockEvent: IpcMainInvokeEvent;

  beforeEach(() => {
    // モックの初期化
    mockSettingsStore = {
      getAllSettings: vi.fn(),
      saveAllSettings: vi.fn(),
      resetToDefaults: vi.fn(),
      getCameraSettings: vi.fn(),
      setCameraSettings: vi.fn(),
      resetDisplaySettings: vi.fn(),
      getMainWindowBounds: vi.fn(),
      setMainWindowBounds: vi.fn(),
      getChatWindowBounds: vi.fn(),
      setChatWindowBounds: vi.fn(),
      getChatWindowVisible: vi.fn(),
      setChatWindowVisible: vi.fn()
    } as any;

    mockWindowManagerController = {
      getMainWindow: vi.fn()
    } as any;

    mockEvent = {} as IpcMainInvokeEvent;

    settingsHandler = new SettingsHandler(mockSettingsStore, mockWindowManagerController);

    // モック関数をリセット
    vi.clearAllMocks();
  });

  describe('設定の取得', () => {
    it('should successfully get all settings', async () => {
      const mockSettings = {
        userName: 'TestUser',
        mascotName: 'TestMascot',
        theme: 'light'
      };

      mockSettingsStore.getAllSettings.mockReturnValue(mockSettings);

      const response = await (settingsHandler as any).handleGetSettings(mockEvent);

      expect(response.success).toBe(true);
      expect(response.data.settings).toEqual(mockSettings);
      expect(mockSettingsStore.getAllSettings).toHaveBeenCalledOnce();
    });

    it('should handle settings retrieval error', async () => {
      const error = new Error('Settings store error');
      mockSettingsStore.getAllSettings.mockImplementation(() => {
        throw error;
      });

      const response = await (settingsHandler as any).handleGetSettings(mockEvent);

      expect(response.success).toBe(false);
      expect(response.error).toContain('設定の取得中にエラーが発生');
    });
  });

  describe('設定の保存', () => {
    it('should successfully save valid settings', async () => {
      const validSettings = {
        userName: 'ValidUser',
        mascotName: 'ValidMascot',
        theme: 'dark'
      };

      mockSettingsStore.saveAllSettings.mockImplementation(() => {});
      mockSettingsStore.getAllSettings.mockReturnValue(validSettings);

      const response = await (settingsHandler as any).handleSaveSettings(mockEvent, validSettings);

      expect(response.success).toBe(true);
      expect(response.data.settings).toEqual(validSettings);
      expect(mockSettingsStore.saveAllSettings).toHaveBeenCalledWith(validSettings);
    });

    it('should reject invalid settings with validation errors', async () => {
      const invalidSettings = {
        userName: '<script>alert("xss")</script>', // XSS attack
        theme: 'invalid-theme' // Invalid theme
      };

      const response = await (settingsHandler as any).handleSaveSettings(mockEvent, invalidSettings);

      expect(response.success).toBe(false);
      expect(response.error).toContain('設定のバリデーションに失敗');
      expect(mockSettingsStore.saveAllSettings).not.toHaveBeenCalled();
    });

    it('should update main window size when windowSize is provided', async () => {
      const mockMainWindow = {
        setSize: vi.fn(),
        isDestroyed: vi.fn().mockReturnValue(false)
      };

      const settingsWithWindowSize = {
        windowSize: { width: 1024, height: 768, preset: 'custom' }
      };

      mockWindowManagerController.getMainWindow.mockReturnValue(mockMainWindow as any);
      mockSettingsStore.saveAllSettings.mockImplementation(() => {});
      mockSettingsStore.getAllSettings.mockReturnValue(settingsWithWindowSize);

      const response = await (settingsHandler as any).handleSaveSettings(mockEvent, settingsWithWindowSize);

      expect(response.success).toBe(true);
      expect(mockMainWindow.setSize).toHaveBeenCalledWith(1024, 768);
    });

    it('should handle save settings error', async () => {
      const validSettings = { userName: 'ValidUser' };
      const error = new Error('Storage error');

      mockSettingsStore.saveAllSettings.mockImplementation(() => {
        throw error;
      });

      const response = await (settingsHandler as any).handleSaveSettings(mockEvent, validSettings);

      expect(response.success).toBe(false);
      expect(response.error).toContain('設定の保存中にエラーが発生');
    });
  });

  describe('設定のリセット', () => {
    it('should successfully reset settings to defaults', async () => {
      const defaultSettings = {
        userName: 'User',
        mascotName: 'Mascot',
        theme: 'light'
      };

      mockSettingsStore.resetToDefaults.mockImplementation(() => {});
      mockSettingsStore.getAllSettings.mockReturnValue(defaultSettings);

      const response = await (settingsHandler as any).handleResetSettings(mockEvent);

      expect(response.success).toBe(true);
      expect(response.data.settings).toEqual(defaultSettings);
      expect(mockSettingsStore.resetToDefaults).toHaveBeenCalledOnce();
    });

    it('should handle reset settings error', async () => {
      const error = new Error('Reset error');
      mockSettingsStore.resetToDefaults.mockImplementation(() => {
        throw error;
      });

      const response = await (settingsHandler as any).handleResetSettings(mockEvent);

      expect(response.success).toBe(false);
      expect(response.error).toContain('設定のリセット中にエラーが発生');
    });
  });

  describe('VRMファイル選択', () => {
    it('should successfully return selected VRM file path', async () => {
      const { dialog } = await import('electron');
      const mockDialog = dialog as { showOpenDialog: Mock };
      
      const mockDialogResult = {
        canceled: false,
        filePaths: ['/path/to/model.vrm']
      };

      mockDialog.showOpenDialog.mockResolvedValue(mockDialogResult);

      const response = await (settingsHandler as any).handleSelectVrmFile(mockEvent);

      expect(response.success).toBe(true);
      expect(response.data.filePath).toBe('/path/to/model.vrm');
      expect(mockDialog.showOpenDialog).toHaveBeenCalledWith({
        title: 'VRMファイルを選択',
        filters: [
          { name: 'VRM Files', extensions: ['vrm'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
    });

    it('should return null when dialog is canceled', async () => {
      const { dialog } = await import('electron');
      const mockDialog = dialog as { showOpenDialog: Mock };

      const mockDialogResult = {
        canceled: true,
        filePaths: []
      };

      mockDialog.showOpenDialog.mockResolvedValue(mockDialogResult);

      const response = await (settingsHandler as any).handleSelectVrmFile(mockEvent);

      expect(response.success).toBe(true);
      expect(response.data.filePath).toBe(null);
    });

    it('should handle dialog error', async () => {
      const { dialog } = await import('electron');
      const mockDialog = dialog as { showOpenDialog: Mock };

      const error = new Error('Dialog error');
      mockDialog.showOpenDialog.mockRejectedValue(error);

      const response = await (settingsHandler as any).handleSelectVrmFile(mockEvent);

      expect(response.success).toBe(false);
      expect(response.error).toContain('VRMファイル選択中にエラーが発生');
    });
  });

  describe('カメラ設定', () => {
    it('should get camera settings successfully', async () => {
      const mockCameraSettings = {
        position: { x: 0, y: 1, z: 5 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1.0
      };

      mockSettingsStore.getCameraSettings.mockReturnValue(mockCameraSettings);

      const response = await (settingsHandler as any).handleGetCameraSettings(mockEvent);

      expect(response.success).toBe(true);
      expect(response.data.settings).toEqual(mockCameraSettings);
    });

    it('should set camera settings with valid data', async () => {
      const validCameraSettings = {
        position: { x: 1, y: 2, z: 3 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1.5
      };

      mockSettingsStore.setCameraSettings.mockImplementation(() => {});

      const response = await (settingsHandler as any).handleSetCameraSettings(mockEvent, validCameraSettings);

      expect(response.success).toBe(true);
      expect(mockSettingsStore.setCameraSettings).toHaveBeenCalledWith(validCameraSettings);
    });

    it('should reject invalid camera settings', async () => {
      const invalidCameraSettings = {
        position: { x: 'invalid', y: 2, z: 3 }, // Invalid x coordinate
        zoom: -1 // Invalid zoom
      };

      const response = await (settingsHandler as any).handleSetCameraSettings(mockEvent, invalidCameraSettings);

      expect(response.success).toBe(false);
      expect(response.error).toContain('カメラ設定のバリデーションに失敗');
      expect(mockSettingsStore.setCameraSettings).not.toHaveBeenCalled();
    });

    it('should reset camera settings successfully', async () => {
      const defaultCameraSettings = {
        position: { x: 0, y: 0, z: 5 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1.0
      };

      mockSettingsStore.resetDisplaySettings.mockImplementation(() => {});
      mockSettingsStore.getCameraSettings.mockReturnValue(defaultCameraSettings);

      const response = await (settingsHandler as any).handleResetCameraSettings(mockEvent);

      expect(response.success).toBe(true);
      expect(response.data.settings).toEqual(defaultCameraSettings);
      expect(mockSettingsStore.resetDisplaySettings).toHaveBeenCalledOnce();
    });
  });

  describe('ウィンドウ位置管理', () => {
    it('should get and set main window bounds', async () => {
      const mockBounds = { x: 100, y: 100, width: 800, height: 600 };

      // Get bounds test
      mockSettingsStore.getMainWindowBounds.mockReturnValue(mockBounds);
      const getResponse = await (settingsHandler as any).handleGetMainWindowBounds(mockEvent);

      expect(getResponse.success).toBe(true);
      expect(getResponse.data.bounds).toEqual(mockBounds);

      // Set bounds test
      mockSettingsStore.setMainWindowBounds.mockImplementation(() => {});
      const setResponse = await (settingsHandler as any).handleSetMainWindowBounds(mockEvent, mockBounds);

      expect(setResponse.success).toBe(true);
      expect(mockSettingsStore.setMainWindowBounds).toHaveBeenCalledWith(mockBounds);
    });

    it('should get and set chat window bounds', async () => {
      const mockBounds = { x: 200, y: 200, width: 400, height: 300 };

      // Get bounds test
      mockSettingsStore.getChatWindowBounds.mockReturnValue(mockBounds);
      const getResponse = await (settingsHandler as any).handleGetChatWindowBounds(mockEvent);

      expect(getResponse.success).toBe(true);
      expect(getResponse.data.bounds).toEqual(mockBounds);

      // Set bounds test
      mockSettingsStore.setChatWindowBounds.mockImplementation(() => {});
      const setResponse = await (settingsHandler as any).handleSetChatWindowBounds(mockEvent, mockBounds);

      expect(setResponse.success).toBe(true);
      expect(mockSettingsStore.setChatWindowBounds).toHaveBeenCalledWith(mockBounds);
    });

    it('should reject invalid window bounds', async () => {
      const invalidBounds = { x: 100, y: 100, width: 50, height: 50 }; // Too small

      const response = await (settingsHandler as any).handleSetMainWindowBounds(mockEvent, invalidBounds);

      expect(response.success).toBe(false);
      expect(response.error).toContain('ウィンドウ位置のバリデーションに失敗');
      expect(mockSettingsStore.setMainWindowBounds).not.toHaveBeenCalled();
    });

    it('should get and set chat window visibility', async () => {
      // Get visibility test
      mockSettingsStore.getChatWindowVisible.mockReturnValue(true);
      const getResponse = await (settingsHandler as any).handleGetChatWindowVisible(mockEvent);

      expect(getResponse.success).toBe(true);
      expect(getResponse.data.visible).toBe(true);

      // Set visibility test
      mockSettingsStore.setChatWindowVisible.mockImplementation(() => {});
      const setResponse = await (settingsHandler as any).handleSetChatWindowVisible(mockEvent, false);

      expect(setResponse.success).toBe(true);
      expect(mockSettingsStore.setChatWindowVisible).toHaveBeenCalledWith(false);
    });
  });

  describe('画面表示設定一括操作', () => {
    it('should save all display settings successfully', async () => {
      const displaySettings = {
        cameraSettings: {
          position: { x: 0, y: 1, z: 5 },
          target: { x: 0, y: 0, z: 0 },
          zoom: 1.0
        },
        mainWindowBounds: { x: 100, y: 100, width: 800, height: 600 },
        chatWindowBounds: { x: 200, y: 200, width: 400, height: 300 },
        chatWindowVisible: true
      };

      mockSettingsStore.setCameraSettings.mockImplementation(() => {});
      mockSettingsStore.setMainWindowBounds.mockImplementation(() => {});
      mockSettingsStore.setChatWindowBounds.mockImplementation(() => {});
      mockSettingsStore.setChatWindowVisible.mockImplementation(() => {});

      const response = await (settingsHandler as any).handleSaveAllDisplaySettings(mockEvent, displaySettings);

      expect(response.success).toBe(true);
      expect(mockSettingsStore.setCameraSettings).toHaveBeenCalledWith(displaySettings.cameraSettings);
      expect(mockSettingsStore.setMainWindowBounds).toHaveBeenCalledWith(displaySettings.mainWindowBounds);
      expect(mockSettingsStore.setChatWindowBounds).toHaveBeenCalledWith(displaySettings.chatWindowBounds);
      expect(mockSettingsStore.setChatWindowVisible).toHaveBeenCalledWith(displaySettings.chatWindowVisible);
    });

    it('should reset all display settings successfully', async () => {
      const defaultSettings = {
        cameraSettings: {
          position: { x: 0, y: 0, z: 5 },
          target: { x: 0, y: 0, z: 0 },
          zoom: 1.0
        }
      };

      mockSettingsStore.resetDisplaySettings.mockImplementation(() => {});
      mockSettingsStore.getAllSettings.mockReturnValue(defaultSettings);

      const response = await (settingsHandler as any).handleResetAllDisplaySettings(mockEvent);

      expect(response.success).toBe(true);
      expect(response.data.settings).toEqual(defaultSettings);
      expect(mockSettingsStore.resetDisplaySettings).toHaveBeenCalledOnce();
    });
  });

  describe('ハンドラー設定とクリーンアップ', () => {
    it('should setup handlers without errors', () => {
      expect(() => {
        settingsHandler.setupHandlers();
      }).not.toThrow();
    });

    it('should cleanup without errors', () => {
      expect(() => {
        settingsHandler.cleanup();
      }).not.toThrow();
    });
  });
});