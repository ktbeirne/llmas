import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel, Content } from '@google/generative-ai';

import { ChatHistoryStore, ChatMessage } from './utils/chatHistoryStore';
import { SettingsStore } from './utils/settingsStore';
import { ToolsService } from './services/toolsService';
import { FunctionCallHandler } from './services/functionCallHandler';
import { LLMFunctionCall } from './types/tools';

/**
 * Gemini APIサービスクラス
 */
export class GeminiService {
  private static instance: GeminiService | null = null;
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private isInitialized = false;
  private chatHistory: ChatHistoryStore;
  private settingsStore: SettingsStore;
  private toolsService: ToolsService;
  private functionCallHandler: FunctionCallHandler;

  private constructor() {
    this.chatHistory = new ChatHistoryStore();
    this.settingsStore = new SettingsStore();
    this.toolsService = ToolsService.getInstance();
    this.functionCallHandler = FunctionCallHandler.getInstance();
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): GeminiService {
    if (!this.instance) {
      this.instance = new GeminiService();
    }
    return this.instance;
  }

  /**
   * Geminiサービスを初期化
   */
  async initialize(apiKey: string): Promise<void> {
    if (!apiKey) {
      throw new Error('APIキーが指定されていません');
    }

    if (this.isInitialized) {
      console.warn('Gemini Service は既に初期化されています');
      return;
    }

    await this.performInitialization(apiKey);
  }

  /**
   * Geminiサービスを強制的に再初期化
   */
  async reinitialize(apiKey: string): Promise<void> {
    if (!apiKey) {
      throw new Error('APIキーが指定されていません');
    }

    console.log('Gemini Service を強制再初期化中...');
    this.isInitialized = false; // 初期化フラグをリセット
    await this.performInitialization(apiKey);
  }

  /**
   * 実際の初期化処理
   */
  private async performInitialization(apiKey: string): Promise<void> {

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      
      // Function Calling用ツールを読み込み
      await this.toolsService.loadTools();
      const tools = this.toolsService.getToolsForGemini();
      console.log('Function Calling用ツールを読み込み:', tools.length, '個');
      
      // 最終的なシステムプロンプトを構築
      const finalSystemPrompt = this.settingsStore.buildFinalSystemPrompt();
      console.log('構築されたシステムプロンプト:', finalSystemPrompt);
      
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-preview-05-20',
        systemInstruction: finalSystemPrompt,
        tools: tools.length > 0 ? tools : undefined,
      });
      
      // ChatHistoryStoreにも設定
      this.chatHistory.setSystemPrompt(finalSystemPrompt);
      
      this.isInitialized = true;
      console.log('Gemini Service が正常に初期化されました（Function Calling対応）');
    } catch (error) {
      this.isInitialized = false;
      throw new Error(`Gemini Service の初期化に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * 会話履歴を含むチャット機能
   */
  async generateChatResponse(userMessage: string): Promise<string> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Gemini Service が初期化されていません');
    }

    if (!userMessage || userMessage.trim().length === 0) {
      throw new Error('メッセージが空です');
    }

    try {
      this.chatHistory.addMessage('user', userMessage);
      
      const fullHistory = this.chatHistory.getFullHistory();
      const contents: Content[] = fullHistory.map(msg => ({
        role: msg.role === 'system' ? 'user' : (msg.role === 'assistant' ? 'model' : msg.role),
        parts: [{ text: msg.role === 'system' ? `System: ${msg.content}` : msg.content }]
      }));

      console.log('Geminiに送信する会話履歴:', contents);
      const result = await this.model.generateContent({ contents });
      const response = result.response;
      
      // Function Callがあるかチェック
      const functionCalls = this.extractFunctionCalls(response);
      
      if (functionCalls.length > 0) {
        console.log('Function Callが検出されました:', functionCalls);
        
        // Function Callを実行
        const functionResults = await this.functionCallHandler.executeFunctions(functionCalls);
        
        // 結果をLLM用に整形
        const functionResultText = this.functionCallHandler.formatResultsForLLM(functionCalls, functionResults);
        
        // Function Call結果を含めて再度LLMに送信
        const followUpContents = [...contents, 
          { role: 'model', parts: [{ text: 'Function Call実行中...' }] },
          { role: 'user', parts: [{ text: `Function Call実行結果:\n${functionResultText}` }] }
        ];
        
        console.log('Function Call結果を含めて再送信:', followUpContents);
        const followUpResult = await this.model.generateContent({ contents: followUpContents });
        const finalResponse = followUpResult.response.text();
        
        this.chatHistory.addMessage('assistant', finalResponse);
        console.log('Function Call処理後の最終応答:', finalResponse);
        return finalResponse;
      } else {
        // 通常の応答
        const text = response.text();
        this.chatHistory.addMessage('assistant', text);
        console.log('Geminiからの返答:', text);
        return text;
      }
    } catch (error) {
      console.error('Gemini APIの呼び出し中にエラーが発生しました:', error);
      throw new Error(
        `チャット生成エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }

  /**
   * テキストを生成（従来の機能、後方互換性のため保持）
   */
  async generateText(prompt: string): Promise<string> {
    if (!this.isInitialized || !this.model) {
      throw new Error('Gemini Service が初期化されていません');
    }

    if (!prompt || prompt.trim().length === 0) {
      throw new Error('プロンプトが空です');
    }

    try {
      console.log(`Geminiへ送信するプロンプト: "${prompt}"`);
      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();
      console.log('Geminiからの返答:', text);
      return text;
    } catch (error) {
      console.error('Gemini APIの呼び出し中にエラーが発生しました:', error);
      throw new Error(
        `テキスト生成エラー: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    }
  }

  /**
   * 会話履歴を取得
   */
  getChatHistory(): ChatMessage[] {
    return this.chatHistory.getHistory();
  }

  /**
   * 会話履歴をクリア
   */
  clearChatHistory(): void {
    this.chatHistory.clearHistory();
  }

  /**
   * システムプロンプトを設定
   */
  setSystemPrompt(prompt: string): void {
    this.chatHistory.setSystemPrompt(prompt);
  }

  /**
   * 設定が変更された時にシステムプロンプトを更新
   */
  updateSystemPrompt(): void {
    if (!this.isInitialized || !this.genAI) {
      console.warn('Gemini Service が初期化されていないため、システムプロンプトを更新できません');
      return;
    }

    try {
      // 最終的なシステムプロンプトを再構築
      const finalSystemPrompt = this.settingsStore.buildFinalSystemPrompt();
      console.log('システムプロンプトを更新:', finalSystemPrompt);
      
      // ツールの再取得
      const tools = this.toolsService.isToolsLoaded() ? this.toolsService.getToolsForGemini() : [];
      
      // モデルを再作成
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-preview-05-20',
        systemInstruction: finalSystemPrompt,
        tools: tools.length > 0 ? tools : undefined,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      });
      
      // ChatHistoryStoreも更新
      this.chatHistory.setSystemPrompt(finalSystemPrompt);
      
      console.log('システムプロンプトが正常に更新されました');
    } catch (error) {
      console.error('システムプロンプトの更新に失敗しました:', error);
    }
  }

  /**
   * システムプロンプトを取得
   */
  getSystemPrompt(): string {
    return this.chatHistory.getSystemPrompt();
  }

  /**
   * サービスが初期化されているかチェック
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Gemini APIのレスポンスからFunction Callを抽出
   */
  private extractFunctionCalls(response: any): LLMFunctionCall[] {
    const functionCalls: LLMFunctionCall[] = [];
    
    try {
      // Gemini APIのFunction Call形式に応じて解析
      const candidates = response.candidates || [];
      
      for (const candidate of candidates) {
        const content = candidate.content;
        if (!content || !content.parts) continue;
        
        for (const part of content.parts) {
          if (part.functionCall) {
            const functionCall: LLMFunctionCall = {
              name: part.functionCall.name,
              args: part.functionCall.args || {}
            };
            functionCalls.push(functionCall);
            console.log('Function Call抽出:', functionCall);
          }
        }
      }
    } catch (error) {
      console.error('Function Call抽出エラー:', error);
    }
    
    return functionCalls;
  }
}

// 後方互換性のための関数
const geminiService = GeminiService.getInstance();

export async function initializeGemini(apiKey: string): Promise<void> {
  return geminiService.initialize(apiKey);
}

export async function reinitializeGemini(apiKey: string): Promise<void> {
  return geminiService.reinitialize(apiKey);
}

export async function generateTextFromGemini(prompt: string): Promise<string> {
  return geminiService.generateText(prompt);
}

export async function generateChatResponse(userMessage: string): Promise<string> {
  return geminiService.generateChatResponse(userMessage);
}

export function getChatHistory(): ChatMessage[] {
  return geminiService.getChatHistory();
}

export function clearChatHistory(): void {
  geminiService.clearChatHistory();
}

export function updateSystemPrompt(): void {
  geminiService.updateSystemPrompt();
}