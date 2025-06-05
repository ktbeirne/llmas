/**
 * Gemini Client - FSD Phase 2
 * Gemini APIクライアントの実装（TDD: GREEN Phase）
 */

import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
  Content
} from '@google/generative-ai';

import type {
  ChatMessage,
  ChatSettings,
  ChatApiResponse,
  SendMessageOptions
} from '../types';

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel | null = null;
  private temperature: number = 0.7;
  private maxTokens: number = 1024;
  private modelName: string = 'gemini-pro';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('APIキーが必要です');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.initializeModel();
  }

  /**
   * モデルを初期化
   */
  private initializeModel(): void {
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
        }
      ],
      generationConfig: {
        temperature: this.temperature,
        maxOutputTokens: this.maxTokens
      }
    });
  }

  /**
   * シンプルなメッセージ送信
   */
  async sendMessage(message: string): Promise<ChatApiResponse> {
    this.validateMessage(message);

    const startTime = Date.now();

    try {
      const result = await this.executeWithRetry(async () => {
        return await this.model!.generateContent(message);
      });

      const response = await result.response;
      const content = response.text();
      const usage = response.usageMetadata;

      return {
        content,
        usage: usage ? {
          promptTokens: usage.promptTokenCount,
          completionTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount
        } : undefined,
        model: this.modelName,
        finishReason: 'stop',
        metadata: {
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 会話履歴付きメッセージ送信
   */
  async sendMessageWithHistory(
    message: string,
    history: ChatMessage[]
  ): Promise<ChatApiResponse> {
    this.validateMessage(message);

    const startTime = Date.now();
    const contents = this.buildContentsFromHistory(history, message);

    try {
      const result = await this.executeWithRetry(async () => {
        return await this.model!.generateContent(contents);
      });

      const response = await result.response;
      const content = response.text();
      const usage = response.usageMetadata;

      return {
        content,
        usage: usage ? {
          promptTokens: usage.promptTokenCount,
          completionTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount
        } : undefined,
        model: this.modelName,
        finishReason: 'stop',
        metadata: {
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * オプション指定でメッセージ送信
   */
  async sendMessageWithOptions(
    message: string,
    options: SendMessageOptions
  ): Promise<ChatApiResponse> {
    this.validateMessage(message);

    const startTime = Date.now();
    let content = message;

    // システムプロンプトの追加
    if (options.systemPrompt) {
      content = `${options.systemPrompt}\n\n${message}`;
    }

    // 一時的にモデル設定を変更
    const originalTemp = this.temperature;
    const originalMaxTokens = this.maxTokens;

    if (options.temperature !== undefined) {
      this.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      this.maxTokens = options.maxTokens;
    }

    // モデルを再初期化（一時的な設定変更のため）
    this.initializeModel();

    try {
      const result = await this.executeWithRetry(async () => {
        return await this.model!.generateContent(content);
      });

      const response = await result.response;
      const responseContent = response.text();
      const usage = response.usageMetadata;

      return {
        content: responseContent,
        usage: usage ? {
          promptTokens: usage.promptTokenCount,
          completionTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount
        } : undefined,
        model: this.modelName,
        finishReason: 'stop',
        metadata: {
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      throw this.handleError(error);
    } finally {
      // 設定を元に戻す
      this.temperature = originalTemp;
      this.maxTokens = originalMaxTokens;
      this.initializeModel();
    }
  }

  /**
   * ストリーミングメッセージ送信
   */
  async sendMessageStream(
    message: string,
    onChunk: (chunk: string) => void
  ): Promise<ChatApiResponse> {
    this.validateMessage(message);

    const startTime = Date.now();
    let fullContent = '';

    try {
      const result = await this.executeWithRetry(async () => {
        return await this.model!.generateContentStream(message);
      });

      // ストリーミングレスポンスを処理
      for await (const chunk of result.stream) {
        const chunkText = chunk.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (chunkText) {
          onChunk(chunkText);
          fullContent += chunkText;
        }
      }

      const response = await result.response;
      const usage = response.usageMetadata;

      return {
        content: fullContent,
        usage: usage ? {
          promptTokens: usage.promptTokenCount,
          completionTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount
        } : undefined,
        model: this.modelName,
        finishReason: 'stop',
        metadata: {
          duration: Date.now() - startTime
        }
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * 設定を更新
   */
  updateSettings(settings: Partial<ChatSettings>): void {
    if (settings.temperature !== undefined) {
      if (settings.temperature < 0 || settings.temperature > 1) {
        throw new Error('temperature は 0.0 から 1.0 の間で設定してください');
      }
      this.temperature = settings.temperature;
    }

    if (settings.maxTokens !== undefined) {
      if (settings.maxTokens <= 0) {
        throw new Error('maxTokens は正の数で設定してください');
      }
      this.maxTokens = settings.maxTokens;
    }

    if (settings.model !== undefined) {
      this.modelName = settings.model;
    }

    // 設定変更後にモデルを再初期化
    this.initializeModel();
  }

  // プライベートメソッド

  /**
   * メッセージのバリデーション
   */
  private validateMessage(message: string): void {
    if (!message || message.trim() === '') {
      throw new Error('メッセージが空です');
    }

    if (message.length > 10000) {
      throw new Error('メッセージが長すぎます（最大10,000文字）');
    }
  }

  /**
   * 履歴からContents配列を構築
   */
  private buildContentsFromHistory(history: ChatMessage[], currentMessage: string): Content[] {
    const contents: Content[] = [];
    
    // システムメッセージを収集
    const systemMessages = history.filter(msg => msg.role === 'system');
    const conversationMessages = history.filter(msg => msg.role !== 'system');

    // システムメッセージがある場合、最初のユーザーメッセージと結合
    if (systemMessages.length > 0) {
      const systemPrompt = systemMessages.map(msg => msg.content).join('\n');
      const firstUserMessage = conversationMessages.find(msg => msg.role === 'user');
      
      if (firstUserMessage) {
        contents.push({
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${firstUserMessage.content}` }]
        });
        
        // 残りのメッセージを追加（最初のユーザーメッセージ以外）
        conversationMessages
          .filter(msg => msg.id !== firstUserMessage.id)
          .forEach(msg => {
            contents.push({
              role: msg.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: msg.content }]
            });
          });
      } else {
        // ユーザーメッセージがない場合、現在のメッセージにシステムプロンプトを結合
        contents.push({
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${currentMessage}` }]
        });
        return contents;
      }
    } else {
      // システムメッセージがない場合、通常の会話履歴を追加
      conversationMessages.forEach(msg => {
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      });
    }

    // 現在のメッセージを追加
    contents.push({
      role: 'user',
      parts: [{ text: currentMessage }]
    });

    return contents;
  }

  /**
   * リトライ付きで関数を実行
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 2
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        
        // 最後の試行または永続的なエラーの場合はリトライしない
        if (attempt === maxRetries || !this.isRetryableError(error)) {
          break;
        }

        // リトライ前の待機
        await this.delay(Math.pow(2, attempt) * 1000);
      }
    }

    throw lastError;
  }

  /**
   * エラーがリトライ可能かどうかを判定
   */
  private isRetryableError(error: any): boolean {
    const message = error?.message || '';
    
    // ネットワークエラーや一時的なサーバーエラーはリトライ可能
    return message.includes('Temporary') || 
           message.includes('Network') || 
           message.includes('timeout');
  }

  /**
   * 待機
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * エラーハンドリング
   */
  private handleError(error: any): Error {
    const message = error?.message || 'Unknown error';
    
    // エラータイプの判定とカスタムエラーメッセージの作成
    if (message.includes('quota') || message.includes('Quota')) {
      return new Error(`APIクォータが上限に達しました: ${message}`);
    }
    
    if (message.includes('Network') || message.includes('network')) {
      return new Error(`ネットワークエラーが発生しました: ${message}`);
    }
    
    if (message.includes('timeout') || message.includes('Timeout')) {
      return new Error(`タイムアウトが発生しました: ${message}`);
    }
    
    return new Error(message);
  }
}