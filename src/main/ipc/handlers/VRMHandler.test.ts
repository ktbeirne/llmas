/**
 * VRMHandler の統合テスト
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';

import { WindowManagerController } from '../../windows/WindowManagerController';

import { VRMHandler } from './VRMHandler';

// Electronモジュールのモック
vi.mock('electron', () => ({
  ipcMain: {
    on: vi.fn(),
    handle: vi.fn()
  },
  BrowserWindow: {
    getAllWindows: vi.fn()
  },
  app: {
    quit: vi.fn()
  }
}));

// 依存関係のモック
vi.mock('../../windows/WindowManagerController');
vi.mock('../../../utils/speechBubbleManager', () => ({
  SpeechBubbleManager: {
    hideAndResetExpression: vi.fn(),
    showWithText: vi.fn()
  }
}));

describe('VRMHandler', () => {
  let vrmHandler: VRMHandler;
  let mockWindowManagerController: vi.Mocked<WindowManagerController>;
  let mockMainWindow: any;
  let mockSpeechBubbleWindow: any;
  let mockSettingsWindow: any;
  let mockWindowManager: any;

  beforeEach(() => {
    // ウィンドウのモック
    mockMainWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      getBounds: vi.fn().mockReturnValue({ x: 100, y: 100, width: 800, height: 600 }),
      close: vi.fn(),
      id: 1,
      getTitle: vi.fn().mockReturnValue('Main Window')
    };

    mockSpeechBubbleWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      setBounds: vi.fn(),
      getBounds: vi.fn().mockReturnValue({ x: 200, y: 50, width: 300, height: 100 }),
      isVisible: vi.fn().mockReturnValue(false),
      show: vi.fn(),
      close: vi.fn(),
      getTitle: vi.fn().mockReturnValue('Speech Bubble'),
      id: 2,
      webContents: {
        executeJavaScript: vi.fn().mockResolvedValue({}),
        send: vi.fn()
      }
    };

    mockSettingsWindow = {
      isDestroyed: vi.fn().mockReturnValue(false),
      show: vi.fn(),
      close: vi.fn()
    };

    // ウィンドウマネージャーのモック
    mockWindowManager = {
      getWindow: vi.fn((name: string) => {
        switch (name) {
          case 'main': return mockMainWindow;
          case 'speechBubble': return mockSpeechBubbleWindow;
          case 'settings': return mockSettingsWindow;
          default: return null;
        }
      })
    };

    // ウィンドウマネージャーコントローラーのモック
    mockWindowManagerController = {
      getWindowManager: vi.fn().mockReturnValue(mockWindowManager),
      toggleChatWindow: vi.fn(),
      toggleSettingsWindow: vi.fn(),
      getSettingsWindowController: vi.fn().mockReturnValue({
        show: vi.fn(),
        close: vi.fn()
      })
    } as any;

    vrmHandler = new VRMHandler(mockWindowManagerController);

    // モック関数をリセット
    vi.clearAllMocks();
  });

  describe('ウィンドウ制御', () => {
    it('should toggle chat window visibility', () => {
      (vrmHandler as any).handleToggleChatVisibility();

      expect(mockWindowManagerController.toggleChatWindow).toHaveBeenCalledOnce();
    });

    it('should handle chat window toggle error gracefully', () => {
      mockWindowManagerController.toggleChatWindow.mockImplementation(() => {
        throw new Error('Toggle error');
      });

      expect(() => {
        (vrmHandler as any).handleToggleChatVisibility();
      }).not.toThrow();
    });

    it('should toggle settings window', () => {
      (vrmHandler as any).handleToggleSettingsWindow();

      expect(mockWindowManagerController.toggleSettingsWindow).toHaveBeenCalledOnce();
    });

    it('should open settings window', () => {
      const mockSettingsController = mockWindowManagerController.getSettingsWindowController();
      
      (vrmHandler as any).handleOpenSettings();

      expect(mockSettingsController.show).toHaveBeenCalledOnce();
    });

    it('should close settings window', () => {
      const mockSettingsController = mockWindowManagerController.getSettingsWindowController();
      
      (vrmHandler as any).handleCloseSettings();

      expect(mockSettingsController.close).toHaveBeenCalledOnce();
    });

    it('should handle settings window operation errors', () => {
      mockWindowManagerController.getSettingsWindowController.mockImplementation(() => {
        throw new Error('Settings controller error');
      });

      expect(() => {
        (vrmHandler as any).handleOpenSettings();
      }).not.toThrow();

      expect(() => {
        (vrmHandler as any).handleCloseSettings();
      }).not.toThrow();
    });
  });

  describe('アプリケーション終了', () => {
    it('should quit app and close all windows', async () => {
      // Electronモジュールを直接インポート
      const electronModule = await import('electron');
      const mockGetAllWindows = electronModule.BrowserWindow.getAllWindows as Mock;
      
      // ウィンドウにgetTitleメソッドを追加
      const mockWindowWithTitle1 = {
        ...mockMainWindow,
        getTitle: vi.fn().mockReturnValue('Main Window'),
        id: 1
      };
      
      const mockWindowWithTitle2 = {
        ...mockSpeechBubbleWindow,
        getTitle: vi.fn().mockReturnValue('Speech Bubble'),
        id: 2
      };

      const mockWindows = [mockWindowWithTitle1, mockWindowWithTitle2];
      mockGetAllWindows.mockReturnValue(mockWindows);

      (vrmHandler as any).handleQuitApp();

      expect(mockWindowWithTitle1.close).toHaveBeenCalledOnce();
      expect(mockWindowWithTitle2.close).toHaveBeenCalledOnce();
    });

    it('should handle app quit errors gracefully', async () => {
      const electronModule = await import('electron');
      const mockGetAllWindows = electronModule.BrowserWindow.getAllWindows as Mock;
      
      mockGetAllWindows.mockImplementation(() => {
        throw new Error('Window enumeration error');
      });

      expect(() => {
        (vrmHandler as any).handleQuitApp();
      }).not.toThrow();
    });

    it('should skip destroyed windows during quit', async () => {
      const electronModule = await import('electron');
      const mockGetAllWindows = electronModule.BrowserWindow.getAllWindows as Mock;
      
      const destroyedWindow = {
        isDestroyed: vi.fn().mockReturnValue(true),
        close: vi.fn(),
        getTitle: vi.fn().mockReturnValue('Destroyed Window'),
        id: 3
      };
      
      const validWindow = {
        isDestroyed: vi.fn().mockReturnValue(false),
        close: vi.fn(),
        getTitle: vi.fn().mockReturnValue('Valid Window'),
        id: 2
      };

      mockGetAllWindows.mockReturnValue([destroyedWindow, validWindow]);

      (vrmHandler as any).handleQuitApp();

      expect(destroyedWindow.close).not.toHaveBeenCalled();
      expect(validWindow.close).toHaveBeenCalledOnce();
    });
  });

  describe('スピーチバブル制御', () => {
    it('should hide speech bubble successfully', async () => {
      const { SpeechBubbleManager } = await import('../../../utils/speechBubbleManager');
      
      (vrmHandler as any).handleHideSpeechBubble();

      expect(SpeechBubbleManager.hideAndResetExpression).toHaveBeenCalledWith(
        mockSpeechBubbleWindow,
        mockMainWindow
      );
    });

    it('should handle hide speech bubble when window is destroyed', () => {
      mockSpeechBubbleWindow.isDestroyed.mockReturnValue(true);

      expect(() => {
        (vrmHandler as any).handleHideSpeechBubble();
      }).not.toThrow();
    });

    it('should handle hide speech bubble errors gracefully', async () => {
      const { SpeechBubbleManager } = await import('../../../utils/speechBubbleManager');
      SpeechBubbleManager.hideAndResetExpression.mockImplementation(() => {
        throw new Error('Hide bubble error');
      });

      expect(() => {
        (vrmHandler as any).handleHideSpeechBubble();
      }).not.toThrow();
    });

    it('should notify bubble size and update position', () => {
      const testSize = { width: 200, height: 80 };
      
      (vrmHandler as any).handleNotifyBubbleSize(null, testSize);

      expect(mockSpeechBubbleWindow.setBounds).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 200,
          height: 80
        })
      );
      expect(mockSpeechBubbleWindow.show).toHaveBeenCalledOnce();
    });

    it('should validate size parameters and reject invalid data', () => {
      const invalidSizes = [
        null,
        undefined,
        { width: 'invalid', height: 100 },
        { width: 100, height: 'invalid' },
        { width: -1, height: 100 },
        { width: 100, height: 0 },
        {}
      ];

      invalidSizes.forEach(invalidSize => {
        expect(() => {
          (vrmHandler as any).handleNotifyBubbleSize(null, invalidSize);
        }).not.toThrow();
        
        // setBoundsが呼ばれないことを確認
        expect(mockSpeechBubbleWindow.setBounds).not.toHaveBeenCalled();
        vi.clearAllMocks();
      });
    });

    it('should apply minimum size constraints', () => {
      const smallSize = { width: 10, height: 5 }; // Very small size
      
      (vrmHandler as any).handleNotifyBubbleSize(null, smallSize);

      expect(mockSpeechBubbleWindow.setBounds).toHaveBeenCalledWith(
        expect.objectContaining({
          width: 80, // Should be clamped to minimum
          height: 50  // Should be clamped to minimum
        })
      );
    });

    it('should calculate position based on main window bounds', () => {
      mockMainWindow.getBounds.mockReturnValue({ x: 100, y: 100, width: 800, height: 600 });
      
      const testSize = { width: 300, height: 100 };
      
      (vrmHandler as any).handleNotifyBubbleSize(null, testSize);

      expect(mockSpeechBubbleWindow.setBounds).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number), // Position should be calculated
          y: expect.any(Number),
          width: 300,
          height: 100
        })
      );
    });

    it('should handle main window unavailable during bubble positioning', () => {
      mockMainWindow.isDestroyed.mockReturnValue(true);
      
      const testSize = { width: 200, height: 80 };
      
      expect(() => {
        (vrmHandler as any).handleNotifyBubbleSize(null, testSize);
      }).not.toThrow();
    });

    it('should not show bubble if already visible', () => {
      mockSpeechBubbleWindow.isVisible.mockReturnValue(true);
      
      const testSize = { width: 200, height: 80 };
      
      (vrmHandler as any).handleNotifyBubbleSize(null, testSize);

      expect(mockSpeechBubbleWindow.show).not.toHaveBeenCalled();
    });

    it('should validate bubble bounds after setting', (done) => {
      const testSize = { width: 200, height: 80 };
      const expectedBounds = { x: 350, y: 45, width: 200, height: 80 };
      
      mockSpeechBubbleWindow.getBounds.mockReturnValue(expectedBounds);
      
      (vrmHandler as any).handleNotifyBubbleSize(null, testSize);

      // validateBubbleBoundsは100ms後に実行される
      setTimeout(() => {
        expect(mockSpeechBubbleWindow.getBounds).toHaveBeenCalled();
        expect(mockSpeechBubbleWindow.webContents.executeJavaScript).toHaveBeenCalled();
        done();
      }, 150);
    });

    it('should handle JavaScript execution errors during validation', (done) => {
      mockSpeechBubbleWindow.webContents.executeJavaScript.mockRejectedValue(new Error('JS Error'));
      
      const testSize = { width: 200, height: 80 };
      
      (vrmHandler as any).handleNotifyBubbleSize(null, testSize);

      setTimeout(() => {
        // エラーが発生してもクラッシュしないことを確認
        expect(mockSpeechBubbleWindow.webContents.executeJavaScript).toHaveBeenCalled();
        done();
      }, 150);
    });
  });

  describe('スピーチバブルからのログ', () => {
    it('should handle log messages from speech bubble', () => {
      const testMessage = 'Test log message from speech bubble';
      
      // console.logをモック
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      (vrmHandler as any).handleLogFromSpeechBubble(null, testMessage);

      expect(consoleSpy).toHaveBeenCalledWith(`[SpeechBubble]: ${testMessage}`);
      
      consoleSpy.mockRestore();
    });
  });

  describe('安全なウィンドウ操作', () => {
    it('should return false for destroyed window', () => {
      mockSpeechBubbleWindow.isDestroyed.mockReturnValue(true);
      
      const result = (vrmHandler as any).safeWindowOperation(
        'testMethod',
        'speechBubble',
        () => {}
      );

      expect(result).toBe(false);
    });

    it('should return false for non-existent window', () => {
      mockWindowManager.getWindow.mockReturnValue(null);
      
      const result = (vrmHandler as any).safeWindowOperation(
        'testMethod',
        'nonExistent',
        () => {}
      );

      expect(result).toBe(false);
    });

    it('should return true for successful operation', () => {
      const mockOperation = vi.fn();
      
      const result = (vrmHandler as any).safeWindowOperation(
        'testMethod',
        'speechBubble',
        mockOperation
      );

      expect(result).toBe(true);
      expect(mockOperation).toHaveBeenCalledOnce();
    });

    it('should handle operation errors and return false', () => {
      const errorOperation = () => {
        throw new Error('Operation error');
      };
      
      const result = (vrmHandler as any).safeWindowOperation(
        'testMethod',
        'speechBubble',
        errorOperation
      );

      expect(result).toBe(false);
    });
  });

  describe('将来機能のプレースホルダー', () => {
    it('should setup VRM handlers without errors', () => {
      expect(() => {
        vrmHandler.setupVRMHandlers();
      }).not.toThrow();
    });

    it('should start window monitoring without errors', () => {
      expect(() => {
        vrmHandler.startWindowMonitoring();
      }).not.toThrow();
    });

    it('should setup 3D display handlers without errors', () => {
      expect(() => {
        vrmHandler.setup3DDisplayHandlers();
      }).not.toThrow();
    });
  });

  describe('ハンドラー設定とクリーンアップ', () => {
    it('should setup handlers without errors', () => {
      expect(() => {
        vrmHandler.setupHandlers();
      }).not.toThrow();
    });

    it('should cleanup successfully', async () => {
      const { SpeechBubbleManager } = await import('../../../utils/speechBubbleManager');
      
      expect(() => {
        vrmHandler.cleanup();
      }).not.toThrow();

      expect(SpeechBubbleManager.hideAndResetExpression).toHaveBeenCalledWith(
        mockSpeechBubbleWindow,
        mockMainWindow
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      const { SpeechBubbleManager } = await import('../../../utils/speechBubbleManager');
      SpeechBubbleManager.hideAndResetExpression.mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      expect(() => {
        vrmHandler.cleanup();
      }).not.toThrow();
    });

    it('should handle cleanup when speech bubble is destroyed', () => {
      mockSpeechBubbleWindow.isDestroyed.mockReturnValue(true);

      expect(() => {
        vrmHandler.cleanup();
      }).not.toThrow();
    });
  });

  describe('ログ出力機能', () => {
    it('should log info messages correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      (vrmHandler as any).log('info', 'testMethod', 'Test message', { data: 'test' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[VRMHandler:testMethod\] Test message/),
        { data: 'test' }
      );
      
      consoleSpy.mockRestore();
    });

    it('should log warning messages correctly', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      (vrmHandler as any).log('warn', 'testMethod', 'Warning message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[VRMHandler:testMethod\] Warning message/),
        ''
      );
      
      consoleSpy.mockRestore();
    });

    it('should log error messages correctly', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      (vrmHandler as any).log('error', 'testMethod', 'Error message', new Error('Test error'));

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/\[VRMHandler:testMethod\] Error message/),
        expect.any(Error)
      );
      
      consoleSpy.mockRestore();
    });
  });
});