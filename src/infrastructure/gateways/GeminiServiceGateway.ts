/**
 * Gemini AIサービスの具体的な実装
 * IAIServiceGatewayインターフェースの実装としてGemini APIへのアクセスを担当
 */

import { 
  GoogleGenerativeAI, 
  GenerativeModel, 
  Content,
  HarmCategory,
  HarmBlockThreshold
} from '@google/generative-ai';

import {
  IAIServiceGateway,
  AIResponse,
  AIServiceConfig,
  AIServiceStatus,
  AIMessageMetadata,
  StreamingCallbacks,
  AIServiceError,
  AIServiceErrorCodes
} from '../../domain/gateways/IAIServiceGateway';
import { ChatMessage } from '../../domain/entities/ChatMessage';
import { UserProfile } from '../../domain/entities/UserProfile';
import { LLMFunctionCall } from '../../types/tools';

/**
 * Gemini固有の設定
 */
interface GeminiConfig {
  model: string;
  apiKey: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
  safetySettings?: Array<{
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }>;
}

/**
 * Gemini AIサービスゲートウェイ実装
 */
export class GeminiServiceGateway implements IAIServiceGateway {
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private config: GeminiConfig | null = null;
  private isInitialized = false;
  private lastError: string | undefined;
  private lastErrorTime: Date | undefined;
  private responseTimeHistory: number[] = [];

  /**
   * 初期化
   */
  async initialize(config: AIServiceConfig): Promise<void> {
    try {
      this.validateConfig(config);
      
      const geminiConfig: GeminiConfig = {
        model: config.model || 'gemini-2.5-flash-preview-05-20',
        apiKey: this.extractApiKey(),
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        tools: [],
        safetySettings: [
          { 
            category: HarmCategory.HARM_CATEGORY_HARASSMENT, 
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE 
          },
          { 
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, 
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE 
          }
        ]
      };

      this.genAI = new GoogleGenerativeAI(geminiConfig.apiKey);
      
      this.model = this.genAI.getGenerativeModel({
        model: geminiConfig.model,
        systemInstruction: config.systemPrompt,
        tools: geminiConfig.tools.length > 0 ? geminiConfig.tools : undefined,
        safetySettings: geminiConfig.safetySettings
      });

      this.config = geminiConfig;
      this.isInitialized = true;
      this.lastError = undefined;
      this.lastErrorTime = undefined;
      
      console.log('ゲートウェイが初期化されました:', geminiConfig.model);
    } catch (error) {
      this.handleError('INITIALIZATION_FAILED', error);
      throw new AIServiceError(
        '初期化に失敗しました',
        'INITIALIZATION_FAILED',
        'gemini',
        false,
        error
      );
    }
  }

  /**
   * メッセージ送信
   */
  async sendMessage(
    message: ChatMessage,
    context: ChatMessage[],
    config?: Partial<AIServiceConfig>
  ): Promise<AIResponse> {
    if (!this.isReady()) {
      throw new AIServiceError(
        'サービスが初期化されていません',
        'SERVICE_NOT_INITIALIZED',
        'gemini'
      );
    }

    const startTime = Date.now();
    
    try {
      const contents = this.buildContents(message, context);
      const result = await this.model!.generateContent({ contents });
      const response = result.response;
      
      const responseTime = Date.now() - startTime;
      this.updateResponseTimeHistory(responseTime);
      
      // Function Callのチェック
      const functionCalls = this.extractFunctionCalls(response);
      
      const responseMessage = ChatMessage.createAssistantMessage(
        response.text() || '空の応答'
      );
      
      const metadata: AIMessageMetadata = {
        model: this.config!.model,
        temperature: this.config!.temperature,
        maxTokens: this.config!.maxTokens,
        responseTime,
        tokenUsage: this.extractTokenUsage(result),
        finishReason: this.extractFinishReason(response)
      };
      
      const aiResponse: AIResponse = {
        message: responseMessage,
        metadata,
        detectedEmotion: await this.detectEmotion(responseMessage),
        recommendedExpression: await this.recommendExpression(responseMessage, [])
      };
      
      // Function Callがある場合の処理は別メソッドで実装
      if (functionCalls.length > 0) {
        console.log('Function Callが検出されました:', functionCalls);
        // ここではFunction Call処理はスキップし、後で実装
      }
      
      return aiResponse;
    } catch (error) {
      this.handleError('MESSAGE_SEND_FAILED', error);
      throw this.createAIServiceError(error);
    }
  }

  /**
   * ストリーミングメッセージ送信
   */
  async sendMessageStream(
    message: ChatMessage,
    context: ChatMessage[],
    callbacks: StreamingCallbacks,
    config?: Partial<AIServiceConfig>
  ): Promise<void> {
    if (!this.isReady()) {
      throw new AIServiceError(
        'サービスが初期化されていません',
        'SERVICE_NOT_INITIALIZED',
        'gemini'
      );
    }

    try {
      callbacks.onStart?.();
      
      const contents = this.buildContents(message, context);
      const result = await this.model!.generateContentStream({ contents });
      
      let fullText = '';
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullText += chunkText;
          callbacks.onChunk?.(chunkText);
        }
      }
      
      const finalResult = await result.response;
      const responseMessage = ChatMessage.createAssistantMessage(fullText);
      
      const aiResponse: AIResponse = {
        message: responseMessage,
        metadata: {
          model: this.config!.model,
          responseTime: 0, // ストリーミングでは正確な測定が困難
          finishReason: this.extractFinishReason(finalResult)
        }
      };
      
      callbacks.onComplete?.(aiResponse);
    } catch (error) {
      this.handleError('STREAMING_FAILED', error);
      callbacks.onError?.(this.createAIServiceError(error));
    }
  }

  /**
   * 会話要約生成
   */
  async summarizeConversation(
    messages: ChatMessage[],
    maxLength: number = 200
  ): Promise<string> {
    if (!this.isReady()) {
      throw new AIServiceError(
        'サービスが初期化されていません',
        'SERVICE_NOT_INITIALIZED',
        'gemini'
      );
    }

    try {
      const conversationText = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      const prompt = `以下の会話を${maxLength}文字以内で要約してください:\n\n${conversationText}`;
      
      const result = await this.model!.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      this.handleError('SUMMARIZATION_FAILED', error);
      throw this.createAIServiceError(error);
    }
  }

  /**
   * 感情分析
   */
  async analyzeEmotion(message: ChatMessage): Promise<{
    emotion: string;
    confidence: number;
    details: { [emotion: string]: number };
  }> {
    // 簡単な実装（実際はより複雑な分析が必要）
    const emotions = ['happy', 'sad', 'neutral', 'excited', 'angry'];
    const randomEmotion = emotions[Math.floor(Math.random() * emotions.length)];
    
    return {
      emotion: randomEmotion,
      confidence: 0.7,
      details: {
        [randomEmotion]: 0.7,
        'neutral': 0.3
      }
    };
  }

  /**
   * 表情推奨
   */
  async recommendExpression(
    message: ChatMessage,
    availableExpressions: string[]
  ): Promise<{
    expression: string;
    confidence: number;
    alternatives: Array<{ expression: string; confidence: number }>;
  }> {
    // 簡単な実装
    const defaultExpression = 'neutral';
    return {
      expression: defaultExpression,
      confidence: 0.8,
      alternatives: [
        { expression: 'happy', confidence: 0.6 },
        { expression: 'relaxed', confidence: 0.4 }
      ]
    };
  }

  /**
   * 推奨メッセージ生成
   */
  async generateSuggestions(
    context: ChatMessage[],
    count: number = 3
  ): Promise<string[]> {
    if (!this.isReady()) {
      throw new AIServiceError(
        'サービスが初期化されていません',
        'SERVICE_NOT_INITIALIZED',
        'gemini'
      );
    }

    try {
      const contextText = context
        .slice(-5) // 最新5件のメッセージを使用
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      const prompt = `以下の会話文脈に基づいて、ユーザーが次に言いそうなことを${count}個推奨してください（簡潔に）:\n\n${contextText}`;
      
      const result = await this.model!.generateContent(prompt);
      const response = result.response.text();
      
      // 簡単なパーシング（実際はより複雑な処理が必要）
      return response
        .split('\n')
        .filter(line => line.trim())
        .slice(0, count);
    } catch (error) {
      this.handleError('SUGGESTION_GENERATION_FAILED', error);
      throw this.createAIServiceError(error);
    }
  }

  /**
   * サービス状態取得
   */
  async getStatus(): Promise<AIServiceStatus> {
    return {
      isAvailable: true,
      isConnected: this.isInitialized,
      lastError: this.lastError,
      lastErrorTime: this.lastErrorTime,
      averageResponseTime: this.calculateAverageResponseTime()
    };
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<boolean> {
    if (!this.isInitialized || !this.model) {
      return false;
    }

    try {
      const result = await this.model.generateContent('こんにちは');
      return !!result.response.text();
    } catch (error) {
      this.handleError('CONNECTION_TEST_FAILED', error);
      return false;
    }
  }

  /**
   * 設定更新
   */
  async updateConfig(config: Partial<AIServiceConfig>): Promise<void> {
    if (!this.genAI || !this.config) {
      throw new AIServiceError(
        'サービスが初期化されていません',
        'SERVICE_NOT_INITIALIZED',
        'gemini'
      );
    }

    try {
      const updatedConfig = { ...this.config, ...config };
      
      this.model = this.genAI.getGenerativeModel({
        model: updatedConfig.model,
        systemInstruction: config.systemPrompt || '',
        tools: updatedConfig.tools,
        safetySettings: updatedConfig.safetySettings
      });
      
      this.config = updatedConfig;
      console.log('設定が更新されました');
    } catch (error) {
      this.handleError('CONFIG_UPDATE_FAILED', error);
      throw this.createAIServiceError(error);
    }
  }

  /**
   * リソースクリーンアップ
   */
  async dispose(): Promise<void> {
    this.genAI = null;
    this.model = null;
    this.config = null;
    this.isInitialized = false;
    this.responseTimeHistory = [];
    console.log('Geminiサービスゲートウェイがクリーンアップされました');
  }

  // プライベートメソッド

  private isReady(): boolean {
    return this.isInitialized && this.model !== null;
  }

  private validateConfig(config: AIServiceConfig): void {
    if (!config.systemPrompt || config.systemPrompt.trim().length === 0) {
      throw new Error('システムプロンプトが必要です');
    }
    
    if (config.temperature !== undefined && (config.temperature < 0 || config.temperature > 1)) {
      throw new Error('temperatureは0から1の範囲で指定してください');
    }
  }

  private extractApiKey(): string {
    // 環境変数からAPIキーを取得
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY環境変数が設定されていません');
    }
    return apiKey;
  }

  private buildContents(message: ChatMessage, context: ChatMessage[]): Content[] {
    const allMessages = [...context, message];
    return allMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }

  private extractFunctionCalls(response: any): LLMFunctionCall[] {
    const functionCalls: LLMFunctionCall[] = [];
    
    try {
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
          }
        }
      }
    } catch (error) {
      console.error('Function Call抽出エラー:', error);
    }
    
    return functionCalls;
  }

  private extractTokenUsage(result: any): AIMessageMetadata['tokenUsage'] {
    // Gemini APIのレスポンスからトークン使用量を抽出
    // 実際のAPIレスポンス構造に合わせて調整が必要
    return {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0
    };
  }

  private extractFinishReason(response: any): AIMessageMetadata['finishReason'] {
    // Gemini APIのレスポンスから終了理由を抽出
    return 'stop';
  }

  private async detectEmotion(message: ChatMessage): Promise<string | undefined> {
    // 簡単な感情検出の実装
    // 実際はより複雑なロジックが必要
    return 'neutral';
  }

  private updateResponseTimeHistory(responseTime: number): void {
    this.responseTimeHistory.push(responseTime);
    // 最新100件のみ保持
    if (this.responseTimeHistory.length > 100) {
      this.responseTimeHistory.shift();
    }
  }

  private calculateAverageResponseTime(): number | undefined {
    if (this.responseTimeHistory.length === 0) {
      return undefined;
    }
    
    const sum = this.responseTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.responseTimeHistory.length;
  }

  private handleError(code: string, error: any): void {
    this.lastError = error instanceof Error ? error.message : String(error);
    this.lastErrorTime = new Date();
    console.error(`Geminiサービスエラー [${code}]:`, error);
  }

  private createAIServiceError(error: any): AIServiceError {
    const message = error instanceof Error ? error.message : String(error);
    
    // エラー種別の判定
    let code = AIServiceErrorCodes.UNKNOWN_ERROR;
    let retryable = false;
    
    if (message.includes('API key')) {
      code = AIServiceErrorCodes.API_KEY_INVALID;
    } else if (message.includes('quota') || message.includes('limit')) {
      code = AIServiceErrorCodes.QUOTA_EXCEEDED;
      retryable = true;
    } else if (message.includes('network') || message.includes('timeout')) {
      code = AIServiceErrorCodes.NETWORK_ERROR;
      retryable = true;
    }
    
    return new AIServiceError(message, code, 'gemini', retryable, error);
  }
}