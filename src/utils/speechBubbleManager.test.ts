import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
// import { BrowserWindow } from 'electron';

// モックの設定
vi.mock('electron', () => ({
  BrowserWindow: vi.fn().mockImplementation(() => ({
    isVisible: vi.fn().mockReturnValue(true),
    show: vi.fn(),
    hide: vi.fn(),
    isDestroyed: vi.fn().mockReturnValue(false),
    webContents: {
      send: vi.fn(),
      on: vi.fn(),
      once: vi.fn()
    },
    setBounds: vi.fn(),
    getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 300, height: 150 })
  }))
}));

describe('SpeechBubbleManager', () => {
  let mockWindow: any;
  let mockWebContents: any;

  beforeEach(() => {
    mockWebContents = {
      send: vi.fn(),
      on: vi.fn(),
      once: vi.fn()
    };
    
    mockWindow = {
      isVisible: vi.fn().mockReturnValue(false),
      show: vi.fn(),
      hide: vi.fn(),
      isDestroyed: vi.fn().mockReturnValue(false),
      webContents: mockWebContents,
      setBounds: vi.fn(),
      getBounds: vi.fn().mockReturnValue({ x: 0, y: 0, width: 300, height: 150 })
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('showSpeechBubbleWithText', () => {
    it('吹き出しウィンドウが非表示の場合、表示してからテキストを送信する', () => {
      // ウィンドウが非表示の状態
      mockWindow.isVisible.mockReturnValue(false);

      // 関数を呼び出す（実際の実装ではこのような関数を作成します）
      const showSpeechBubbleWithText = (window: any, text: string) => {
        if (!window.isVisible()) {
          window.show();
        }
        window.webContents.send('set-speech-bubble-text', text);
      };

      const testText = 'こんにちは、ご主人様！';
      showSpeechBubbleWithText(mockWindow, testText);

      // ウィンドウが表示されたことを確認
      expect(mockWindow.show).toHaveBeenCalledTimes(1);
      
      // テキストが送信されたことを確認
      expect(mockWebContents.send).toHaveBeenCalledWith('set-speech-bubble-text', testText);
    });

    it('吹き出しウィンドウが既に表示されている場合、表示処理をスキップしてテキストを送信する', () => {
      // ウィンドウが表示されている状態
      mockWindow.isVisible.mockReturnValue(true);

      const showSpeechBubbleWithText = (window: any, text: string) => {
        if (!window.isVisible()) {
          window.show();
        }
        window.webContents.send('set-speech-bubble-text', text);
      };

      const testText = 'お元気ですか？';
      showSpeechBubbleWithText(mockWindow, testText);

      // ウィンドウの表示メソッドが呼ばれていないことを確認
      expect(mockWindow.show).not.toHaveBeenCalled();
      
      // テキストが送信されたことを確認
      expect(mockWebContents.send).toHaveBeenCalledWith('set-speech-bubble-text', testText);
    });

    it('ウィンドウが破棄されている場合、何も実行しない', () => {
      // ウィンドウが破棄されている状態
      mockWindow.isDestroyed.mockReturnValue(true);

      const showSpeechBubbleWithText = (window: any, text: string) => {
        if (window.isDestroyed()) {
          return;
        }
        if (!window.isVisible()) {
          window.show();
        }
        window.webContents.send('set-speech-bubble-text', text);
      };

      const testText = 'テストメッセージ';
      showSpeechBubbleWithText(mockWindow, testText);

      // 何も呼ばれていないことを確認
      expect(mockWindow.show).not.toHaveBeenCalled();
      expect(mockWebContents.send).not.toHaveBeenCalled();
    });

    it('webContentsの準備が完了してからテキストを送信する', () => {
      const showSpeechBubbleWithText = (window: any, text: string) => {
        if (window.isDestroyed()) {
          return;
        }
        
        const sendText = () => {
          window.webContents.send('set-speech-bubble-text', text);
        };

        if (!window.isVisible()) {
          window.show();
          // webContentsの準備完了を待つ
          window.webContents.once('did-finish-load', sendText);
        } else {
          sendText();
        }
      };

      mockWindow.isVisible.mockReturnValue(false);
      const testText = 'WebContentsテスト';
      showSpeechBubbleWithText(mockWindow, testText);

      // showが呼ばれたことを確認
      expect(mockWindow.show).toHaveBeenCalledTimes(1);
      
      // did-finish-loadイベントのリスナーが登録されたことを確認
      expect(mockWebContents.once).toHaveBeenCalledWith('did-finish-load', expect.any(Function));
    });
  });
});