/**
 * Screen Adapter Tests - FSD Phase 2
 * Electron APIとの統合をテスト
 */

import { describe, it, expect, beforeEach, vi, afterEach, Mock } from 'vitest';
import { ScreenAdapter } from './screen-adapter';
import { UnsupportedPlatformError, AccessibilityPermissionError } from '../types';

// モック
const mockElectronAPI = {
  screen: {
    getCursorScreenPoint: vi.fn()
  },
  systemPreferences: {
    isTrustedAccessibilityClient: vi.fn()
  },
  dialog: {
    showMessageBox: vi.fn(),
    showErrorBox: vi.fn()
  }
};

// グローバルモックの設定
(global as any).window = {
  electronAPI: mockElectronAPI,
  screen: {
    width: 1920,
    height: 1080
  }
};

describe('ScreenAdapter', () => {
  let adapter: ScreenAdapter;
  let originalPlatform: PropertyDescriptor | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    // デフォルトはmacOS
    originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      configurable: true
    });
  });

  afterEach(() => {
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform);
    }
  });

  describe('プラットフォーム検証', () => {
    it('should throw error on Linux platform', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      expect(() => new ScreenAdapter()).toThrow(UnsupportedPlatformError);
      expect(mockElectronAPI.dialog.showErrorBox).toHaveBeenCalled();
    });

    it('should accept Windows platform', () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      
      expect(() => new ScreenAdapter()).not.toThrow();
    });

    it('should accept macOS platform', () => {
      Object.defineProperty(process, 'platform', { value: 'darwin' });
      
      expect(() => new ScreenAdapter()).not.toThrow();
    });
  });

  describe('アクセシビリティ権限', () => {
    beforeEach(() => {
      adapter = new ScreenAdapter();
    });

    it('should check accessibility permission on macOS', async () => {
      mockElectronAPI.systemPreferences.isTrustedAccessibilityClient.mockReturnValue(true);
      
      const hasPermission = await adapter.checkPermission();
      
      expect(hasPermission).toBe(true);
      expect(mockElectronAPI.systemPreferences.isTrustedAccessibilityClient).toHaveBeenCalledWith(false);
    });

    it('should always return true on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      adapter = new ScreenAdapter();
      
      const hasPermission = await adapter.checkPermission();
      
      expect(hasPermission).toBe(true);
      expect(mockElectronAPI.systemPreferences.isTrustedAccessibilityClient).not.toHaveBeenCalled();
    });

    it('should request permission when not granted', async () => {
      mockElectronAPI.systemPreferences.isTrustedAccessibilityClient
        .mockReturnValueOnce(false) // 初回チェック
        .mockReturnValueOnce(true); // 権限付与後
      
      mockElectronAPI.dialog.showMessageBox.mockResolvedValue({ response: 0 });
      
      const granted = await adapter.requestPermission();
      
      expect(granted).toBe(true);
      expect(mockElectronAPI.dialog.showMessageBox).toHaveBeenCalled();
      expect(mockElectronAPI.systemPreferences.isTrustedAccessibilityClient).toHaveBeenCalledWith(true);
    });

    it('should return false when user cancels permission', async () => {
      mockElectronAPI.dialog.showMessageBox.mockResolvedValue({ response: 1 });
      
      const granted = await adapter.requestPermission();
      
      expect(granted).toBe(false);
    });
  });

  describe('マウス位置取得', () => {
    beforeEach(() => {
      adapter = new ScreenAdapter();
    });

    it('should get mouse position', () => {
      const mockPosition = { x: 500, y: 300 };
      mockElectronAPI.screen.getCursorScreenPoint.mockReturnValue(mockPosition);
      
      const position = adapter.getMousePosition();
      
      expect(position).toEqual({
        x: 500,
        y: 300,
        timestamp: expect.any(Number)
      });
    });

    it('should throw error when API is not available', () => {
      (mockElectronAPI.screen.getCursorScreenPoint as Mock).mockImplementation(() => {
        throw new Error('API not available');
      });
      
      expect(() => adapter.getMousePosition()).toThrow('Failed to get mouse position');
    });
  });

  describe('画面情報取得', () => {
    beforeEach(() => {
      adapter = new ScreenAdapter();
    });

    it('should get screen bounds', () => {
      const bounds = adapter.getScreenBounds();
      
      expect(bounds).toEqual({
        width: 1920,
        height: 1080,
        x: 0,
        y: 0
      });
    });
  });

  describe('初期化処理', () => {
    beforeEach(() => {
      adapter = new ScreenAdapter();
    });

    it('should initialize successfully with permission on macOS', async () => {
      mockElectronAPI.systemPreferences.isTrustedAccessibilityClient.mockReturnValue(true);
      
      await expect(adapter.initialize()).resolves.toBeUndefined();
    });

    it('should throw error when permission denied on macOS', async () => {
      mockElectronAPI.systemPreferences.isTrustedAccessibilityClient
        .mockReturnValueOnce(false) // 初回チェック
        .mockReturnValue(false); // 権限要求後も拒否
      
      mockElectronAPI.dialog.showMessageBox.mockResolvedValue({ response: 1 });
      
      await expect(adapter.initialize()).rejects.toThrow(AccessibilityPermissionError);
    });

    it('should initialize without permission check on Windows', async () => {
      Object.defineProperty(process, 'platform', { value: 'win32' });
      adapter = new ScreenAdapter();
      
      await expect(adapter.initialize()).resolves.toBeUndefined();
      expect(mockElectronAPI.systemPreferences.isTrustedAccessibilityClient).not.toHaveBeenCalled();
    });
  });

  describe('通知設定', () => {
    beforeEach(() => {
      adapter = new ScreenAdapter();
    });

    it('should show permission dialog with Japanese text', async () => {
      mockElectronAPI.dialog.showMessageBox.mockResolvedValue({ response: 0 });
      
      await adapter.requestPermission();
      
      const callArgs = mockElectronAPI.dialog.showMessageBox.mock.calls[0][0];
      expect(callArgs.title).toContain('アクセシビリティ権限');
      expect(callArgs.message).toContain('マウス位置を追跡');
      expect(callArgs.buttons).toContain('システム環境設定を開く');
    });

    it('should show error dialog for unsupported OS', () => {
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      expect(() => new ScreenAdapter()).toThrow();
      
      const callArgs = mockElectronAPI.dialog.showErrorBox.mock.calls[0];
      expect(callArgs[0]).toContain('サポート対象外');
      expect(callArgs[1]).toContain('Linux環境をサポートしていません');
    });
  });
});