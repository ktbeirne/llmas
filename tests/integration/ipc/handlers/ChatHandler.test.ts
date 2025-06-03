/**
 * ChatHandler の統合テスト
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest';
import { IpcMainInvokeEvent } from 'electron';

import { SettingsStore } from '@/utils/settingsStore';
import { WindowManagerController } from '@/main/windows/WindowManagerController';

import { ChatHandler } from '@/main/ipc/handlers/ChatHandler';


// Electronモジュールのモック
vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}));

// 依存関係のモック
vi.mock('electron-store', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      has: vi.fn(),
      size: 0,
      store: {}
    }))
  };
});

vi.mock('@/utils/settingsStore');
vi.mock('@/main/windows/WindowManagerController');
vi.mock('@/geminiService', () => ({
  generateTextFromGemini: vi.fn(),
  generateChatResponse: vi.fn(),
  getChatHistory: vi.fn(),
  clearChatHistory: vi.fn(),
  updateSystemPrompt: vi.fn()
}));
vi.mock('@/utils/errorHandler', () => ({
  ErrorHandler: {
    handle: vi.fn()
  }
}));

describe('ChatHandler', () => {
  let chatHandler: ChatHandler;
  let mockSettingsStore: vi.Mocked<SettingsStore>;
  let mockWindowManagerController: vi.Mocked<WindowManagerController>;
  let mockEvent: IpcMainInvokeEvent;

  beforeEach(() => {
    // モックの初期化
    mockSettingsStore = {
      getSystemPrompt: vi.fn(),
      setSystemPrompt: vi.fn(),
      resetSystemPromptToDefault: vi.fn(),
      getUserName: vi.fn(),
      setUserName: vi.fn(),
      getMascotName: vi.fn(),
      setMascotName: vi.fn(),
      getSystemPromptCore: vi.fn(),
      setSystemPromptCore: vi.fn()
    } as any;

    mockWindowManagerController = {
      getWindowManager: vi.fn().mockReturnValue({
        getWindow: vi.fn().mockReturnValue({
          isDestroyed: vi.fn().mockReturnValue(false),
          webContents: {
            send: vi.fn()
          }
        })
      })
    } as any;

    mockEvent = {} as IpcMainInvokeEvent;

    chatHandler = new ChatHandler(mockSettingsStore, mockWindowManagerController);

    // モック関数をリセット
    vi.clearAllMocks();
  });

  describe('プロンプト送信（従来機能）', () => {
    it('should successfully send prompt to Gemini', async () => {
      const { generateTextFromGemini } = await import('@/geminiService');
      const mockGenerate = generateTextFromGemini as Mock;
      
      const testPrompt = 'Hello, how are you?';
      const expectedResponse = 'I am doing well, thank you!';
      
      mockGenerate.mockResolvedValue(expectedResponse);

      const response = await (chatHandler as any).handleSendPromptToGemini(mockEvent, testPrompt);

      expect(response).toBe(expectedResponse);
      expect(mockGenerate).toHaveBeenCalledWith(testPrompt);
    });

    it('should reject invalid prompt with XSS', async () => {
      const xssPrompt = '<script>alert("xss")</script>';

      const response = await (chatHandler as any).handleSendPromptToGemini(mockEvent, xssPrompt);

      expect(response).toContain('プロンプトのバリデーションに失敗');
      expect(response).toContain('危険なスクリプト');
    });

    it('should handle Gemini API error', async () => {
      const { generateTextFromGemini } = await import('@/geminiService');
      const mockGenerate = generateTextFromGemini as Mock;
      
      const testPrompt = 'Valid prompt';
      const error = new Error('API Error');
      
      mockGenerate.mockRejectedValue(error);

      const response = await (chatHandler as any).handleSendPromptToGemini(mockEvent, testPrompt);

      expect(response).toContain('エラー');
      expect(response).toContain('API Error');
    });

    it('should reject empty prompt', async () => {
      const emptyPrompt = '';

      const response = await (chatHandler as any).handleSendPromptToGemini(mockEvent, emptyPrompt);

      expect(response).toContain('プロンプトのバリデーションに失敗');
    });

    it('should reject extremely long prompt', async () => {
      const longPrompt = 'A'.repeat(60000); // Exceeds MAX_PROMPT_LENGTH

      const response = await (chatHandler as any).handleSendPromptToGemini(mockEvent, longPrompt);

      expect(response).toContain('プロンプトのバリデーションに失敗');
    });
  });

  describe('チャットメッセージ送信（履歴管理付き）', () => {
    it('should successfully send chat message', async () => {
      const { generateChatResponse } = await import('@/geminiService');
      const mockGenerate = generateChatResponse as Mock;
      
      const testMessage = 'What is the weather like?';
      const expectedResponse = 'I cannot access real-time weather data.';
      
      mockGenerate.mockResolvedValue(expectedResponse);

      const response = await (chatHandler as any).handleSendChatMessage(mockEvent, testMessage);

      expect(response).toBe(expectedResponse);
      expect(mockGenerate).toHaveBeenCalledWith(testMessage);
    });

    it('should reject invalid chat message', async () => {
      const invalidMessage = '<iframe src="javascript:alert(1)"></iframe>';

      const response = await (chatHandler as any).handleSendChatMessage(mockEvent, invalidMessage);

      expect(response).toContain('メッセージのバリデーションに失敗');
      expect(response).toContain('危険なスクリプト');
    });

    it('should handle chat service error', async () => {
      const { generateChatResponse } = await import('@/geminiService');
      const mockGenerate = generateChatResponse as Mock;
      
      const testMessage = 'Valid message';
      const error = new Error('Chat service error');
      
      mockGenerate.mockRejectedValue(error);

      const response = await (chatHandler as any).handleSendChatMessage(mockEvent, testMessage);

      expect(response).toContain('エラー');
      expect(response).toContain('Chat service error');
    });
  });

  describe('チャット履歴管理', () => {
    it('should get chat history successfully', async () => {
      const { getChatHistory } = await import('@/geminiService');
      const mockGetHistory = getChatHistory as Mock;
      
      const mockHistory = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' }
      ];
      
      mockGetHistory.mockReturnValue(mockHistory);

      const response = await (chatHandler as any).handleGetChatHistory(mockEvent);

      expect(response).toHaveLength(2);
      expect(response[0]).toHaveProperty('id');
      expect(response[0]).toHaveProperty('role', 'user');
      expect(response[0]).toHaveProperty('content', 'Hello');
      expect(response[0]).toHaveProperty('timestamp');
    });

    it('should handle history retrieval error', async () => {
      const { getChatHistory } = await import('@/geminiService');
      const mockGetHistory = getChatHistory as Mock;
      
      mockGetHistory.mockImplementation(() => {
        throw new Error('History error');
      });

      const response = await (chatHandler as any).handleGetChatHistory(mockEvent);

      expect(response).toEqual([]);
    });

    it('should clear chat history successfully', async () => {
      const { clearChatHistory } = await import('@/geminiService');
      const mockClearHistory = clearChatHistory as Mock;
      
      mockClearHistory.mockImplementation(() => {});

      const response = await (chatHandler as any).handleClearChatHistory(mockEvent);

      expect(response.success).toBe(true);
      expect(mockClearHistory).toHaveBeenCalledOnce();
    });

    it('should handle clear history error', async () => {
      const { clearChatHistory } = await import('@/geminiService');
      const mockClearHistory = clearChatHistory as Mock;
      
      mockClearHistory.mockImplementation(() => {
        throw new Error('Clear error');
      });

      const response = await (chatHandler as any).handleClearChatHistory(mockEvent);

      expect(response.success).toBe(false);
      expect(response.error).toContain('チャット履歴のクリア中にエラーが発生');
    });
  });

  describe('システムプロンプト管理', () => {
    it('should get system prompt successfully', async () => {
      const mockPrompt = 'You are a helpful assistant.';
      mockSettingsStore.getSystemPrompt.mockReturnValue(mockPrompt);

      const response = await (chatHandler as any).handleGetSystemPrompt(mockEvent);

      expect(response).toBe(mockPrompt);
      expect(mockSettingsStore.getSystemPrompt).toHaveBeenCalledOnce();
    });

    it('should set system prompt successfully', async () => {
      const newPrompt = 'You are a desktop mascot.';
      mockSettingsStore.setSystemPrompt.mockImplementation(() => {});

      const response = await (chatHandler as any).handleSetSystemPrompt(mockEvent, newPrompt);

      expect(response.success).toBe(true);
      expect(mockSettingsStore.setSystemPrompt).toHaveBeenCalledWith(newPrompt);
    });

    it('should reject invalid system prompt', async () => {
      const invalidPrompt = '<script>malicious code</script>';

      const response = await (chatHandler as any).handleSetSystemPrompt(mockEvent, invalidPrompt);

      expect(response.success).toBe(false);
      expect(response.error).toContain('システムプロンプトのバリデーションに失敗');
    });

    it('should reset system prompt successfully', async () => {
      mockSettingsStore.resetSystemPromptToDefault.mockImplementation(() => {});

      const response = await (chatHandler as any).handleResetSystemPrompt(mockEvent);

      expect(response.success).toBe(true);
      expect(mockSettingsStore.resetSystemPromptToDefault).toHaveBeenCalledOnce();
    });

    it('should handle system prompt errors', async () => {
      const error = new Error('Settings error');
      mockSettingsStore.getSystemPrompt.mockImplementation(() => {
        throw error;
      });

      await expect((chatHandler as any).handleGetSystemPrompt(mockEvent)).rejects.toThrow('Settings error');
    });
  });

  describe('ユーザー名管理', () => {
    it('should get and set user name successfully', async () => {
      const testUserName = 'TestUser';
      
      // Get user name test
      mockSettingsStore.getUserName.mockReturnValue(testUserName);
      const getResponse = await (chatHandler as any).handleGetUserName(mockEvent);
      expect(getResponse).toBe(testUserName);

      // Set user name test
      const { updateSystemPrompt } = await import('@/geminiService');
      const mockUpdate = updateSystemPrompt as Mock;
      mockSettingsStore.setUserName.mockImplementation(() => {});
      mockUpdate.mockImplementation(() => {});
      
      const setResponse = await (chatHandler as any).handleSetUserName(mockEvent, testUserName);
      expect(setResponse.success).toBe(true);
      expect(mockSettingsStore.setUserName).toHaveBeenCalledWith(testUserName);
      expect(mockUpdate).toHaveBeenCalledOnce();
    });

    it('should reject invalid user name', async () => {
      const invalidUserName = '<script>alert("xss")</script>';

      const response = await (chatHandler as any).handleSetUserName(mockEvent, invalidUserName);

      expect(response.success).toBe(false);
      expect(response.error).toContain('ユーザー名のバリデーションに失敗');
    });

    it('should reject empty user name', async () => {
      const emptyUserName = '';

      const response = await (chatHandler as any).handleSetUserName(mockEvent, emptyUserName);

      expect(response.success).toBe(false);
      expect(response.error).toContain('ユーザー名のバリデーションに失敗');
    });

    it('should reject too long user name', async () => {
      const longUserName = 'A'.repeat(100); // Exceeds 50 character limit

      const response = await (chatHandler as any).handleSetUserName(mockEvent, longUserName);

      expect(response.success).toBe(false);
      expect(response.error).toContain('ユーザー名のバリデーションに失敗');
    });
  });

  describe('マスコット名管理', () => {
    it('should get and set mascot name successfully', async () => {
      const testMascotName = 'TestMascot';
      
      // Get mascot name test
      mockSettingsStore.getMascotName.mockReturnValue(testMascotName);
      const getResponse = await (chatHandler as any).handleGetMascotName(mockEvent);
      expect(getResponse).toBe(testMascotName);

      // Set mascot name test
      const { updateSystemPrompt } = await import('@/geminiService');
      const mockUpdate = updateSystemPrompt as Mock;
      mockSettingsStore.setMascotName.mockImplementation(() => {});
      mockUpdate.mockImplementation(() => {});
      
      const setResponse = await (chatHandler as any).handleSetMascotName(mockEvent, testMascotName);
      expect(setResponse.success).toBe(true);
      expect(mockSettingsStore.setMascotName).toHaveBeenCalledWith(testMascotName);
      expect(mockUpdate).toHaveBeenCalledOnce();
    });

    it('should reject invalid mascot name', async () => {
      const invalidMascotName = 'javascript:alert(1)';

      const response = await (chatHandler as any).handleSetMascotName(mockEvent, invalidMascotName);

      expect(response.success).toBe(false);
      expect(response.error).toContain('マスコット名のバリデーションに失敗');
    });
  });

  describe('システムプロンプトコア管理', () => {
    it('should get, set and reset system prompt core successfully', async () => {
      const testCore = 'You are a friendly desktop mascot.';
      
      // Get core test
      mockSettingsStore.getSystemPromptCore.mockReturnValue(testCore);
      const getResponse = await (chatHandler as any).handleGetSystemPromptCore(mockEvent);
      expect(getResponse).toBe(testCore);

      // Set core test
      const { updateSystemPrompt } = await import('@/geminiService');
      const mockUpdate = updateSystemPrompt as Mock;
      mockSettingsStore.setSystemPromptCore.mockImplementation(() => {});
      mockUpdate.mockImplementation(() => {});
      
      const setResponse = await (chatHandler as any).handleSetSystemPromptCore(mockEvent, testCore);
      expect(setResponse.success).toBe(true);
      expect(mockSettingsStore.setSystemPromptCore).toHaveBeenCalledWith(testCore);
      expect(mockUpdate).toHaveBeenCalledOnce();

      // Reset core test
      const resetResponse = await (chatHandler as any).handleResetSystemPromptCore(mockEvent);
      expect(resetResponse.success).toBe(true);
      expect(mockSettingsStore.setSystemPromptCore).toHaveBeenCalledWith(
        'あなたは親しみやすいデスクトップマスコットです。ユーザーとの会話を楽しみ、役立つ情報を提供してください。'
      );
    });

    it('should reject invalid system prompt core', async () => {
      const invalidCore = '<object data="malicious"></object>';

      const response = await (chatHandler as any).handleSetSystemPromptCore(mockEvent, invalidCore);

      expect(response.success).toBe(false);
      expect(response.error).toContain('システムプロンプトコアのバリデーションに失敗');
    });
  });

  describe('ハンドラー設定とクリーンアップ', () => {
    it('should setup handlers without errors', () => {
      expect(() => {
        chatHandler.setupHandlers();
      }).not.toThrow();
    });

    it('should cleanup without errors', () => {
      expect(() => {
        chatHandler.cleanup();
      }).not.toThrow();
    });
  });

  describe('エラーハンドリングとスピーチバブル', () => {
    it('should handle speech bubble display errors gracefully', async () => {
      // ウィンドウマネージャーエラーをシミュレート
      mockWindowManagerController.getWindowManager.mockImplementation(() => {
        throw new Error('Window manager error');
      });

      const testPrompt = 'Test prompt';
      
      // エラーが発生してもクラッシュしないことを確認
      expect(async () => {
        await (chatHandler as any).handleSendPromptToGemini(mockEvent, testPrompt);
      }).not.toThrow();
    });

    it('should show error messages in speech bubble when available', async () => {
      const mockWindow = {
        isDestroyed: vi.fn().mockReturnValue(false)
      };
      
      mockWindowManagerController.getWindowManager.mockReturnValue({
        getWindow: vi.fn().mockReturnValue(mockWindow)
      } as any);

      const { generateTextFromGemini } = await import('@/geminiService');
      const mockGenerate = generateTextFromGemini as Mock;
      mockGenerate.mockRejectedValue(new Error('API Error'));

      const response = await (chatHandler as any).handleSendPromptToGemini(mockEvent, 'test');

      expect(response).toContain('エラー');
      expect(response).toContain('API Error');
    });
  });
});