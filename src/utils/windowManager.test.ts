import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WindowManager } from './WindowManager';
import { BrowserWindow } from 'electron';

// モックの設定
vi.mock('electron', () => ({
  BrowserWindow: vi.fn().mockImplementation(() => ({
    isVisible: vi.fn().mockReturnValue(false),
    show: vi.fn(),
    hide: vi.fn(),
    close: vi.fn(),
    focus: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
    getTitle: vi.fn().mockReturnValue('Test Window'),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
      once: vi.fn(),
      loadURL: vi.fn(),
      loadFile: vi.fn()
    },
    on: vi.fn(),
    once: vi.fn(),
    setBounds: vi.fn(),
    getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 300, height: 150 }),
    loadURL: vi.fn(),
    loadFile: vi.fn()
  }))
}));

vi.mock('path', () => ({
  default: {
    join: vi.fn((...args) => args.join('/'))
  }
}));

// MAIN_WINDOW_VITE_DEV_SERVER_URL をモック
global.MAIN_WINDOW_VITE_DEV_SERVER_URL = 'http://localhost:5173';

describe('WindowManager', () => {
  let windowManager: WindowManager;

  beforeEach(() => {
    windowManager = new WindowManager();
    vi.clearAllMocks();
  });

  afterEach(() => {
    windowManager.closeAllWindows();
  });

  describe('createWindow', () => {
    it('SpeechBubbleウィンドウを正しいパスで作成する（開発環境）', () => {
      const config = WindowManager.getSpeechBubbleConfig();
      const speechBubbleHtmlPath = 'speech_bubble/index.html';

      const window = windowManager.createWindow(config, speechBubbleHtmlPath);

      expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        hasShadow: false,
        show: false
      }));

      // loadURLが正しいパスで呼ばれることを確認
      expect(window.loadURL).toHaveBeenCalledWith('http://localhost:5173/renderer/speech_bubble/');
    });

    it('メインウィンドウを正しいパスで作成する（開発環境）', () => {
      const config = WindowManager.getMainWindowConfig();
      const mainHtmlPath = 'index.html';

      const window = windowManager.createWindow(config, mainHtmlPath);

      expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        transparent: true,
        frame: false
      }));

      // loadURLが正しいパスで呼ばれることを確認
      expect(window.loadURL).toHaveBeenCalledWith('http://localhost:5173');
    });

    it('チャットウィンドウを正しいパスで作成する（開発環境）', () => {
      const config = WindowManager.getChatWindowConfig();
      const chatHtmlPath = 'chat.html';

      const window = windowManager.createWindow(config, chatHtmlPath);

      expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        transparent: true,
        frame: false
      }));

      // loadURLが正しいパスで呼ばれることを確認
      expect(window.loadURL).toHaveBeenCalledWith('http://localhost:5173/chat.html');
    });

    it('設定ウィンドウを正しいパスで作成する（開発環境）', () => {
      const config = WindowManager.getSettingsWindowConfig();
      const settingsHtmlPath = 'settings.html';

      const window = windowManager.createWindow(config, settingsHtmlPath);

      expect(BrowserWindow).toHaveBeenCalledWith(expect.objectContaining({
        frame: false,
        transparent: false
      }));

      // loadURLが正しいパスで呼ばれることを確認
      expect(window.loadURL).toHaveBeenCalledWith('http://localhost:5173/settings.html');
    });

    it('ウィンドウがMapに正しく保存される', () => {
      const config = WindowManager.getSpeechBubbleConfig();
      const speechBubbleHtmlPath = 'speech_bubble/index.html';

      const window = windowManager.createWindow(config, speechBubbleHtmlPath);
      const retrievedWindow = windowManager.getWindow('speechBubble');

      expect(retrievedWindow).toBe(window);
    });

    it('既存のウィンドウが存在する場合、新しいウィンドウを作成せずに既存のウィンドウを返す', () => {
      const config = WindowManager.getSpeechBubbleConfig();
      const speechBubbleHtmlPath = 'speech_bubble/index.html';

      const window1 = windowManager.createWindow(config, speechBubbleHtmlPath);
      const window2 = windowManager.createWindow(config, speechBubbleHtmlPath);

      expect(window1).toBe(window2);
      expect(BrowserWindow).toHaveBeenCalledTimes(1);
    });
  });

  describe('getWindow', () => {
    it('存在するウィンドウを正しく取得する', () => {
      const config = WindowManager.getSpeechBubbleConfig();
      const speechBubbleHtmlPath = 'speech_bubble/index.html';

      const createdWindow = windowManager.createWindow(config, speechBubbleHtmlPath);
      const retrievedWindow = windowManager.getWindow('speechBubble');

      expect(retrievedWindow).toBe(createdWindow);
    });

    it('存在しないウィンドウの場合、undefinedを返す', () => {
      const retrievedWindow = windowManager.getWindow('nonexistent');
      expect(retrievedWindow).toBeUndefined();
    });
  });
});