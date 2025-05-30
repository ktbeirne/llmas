import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai';

/**
 * Gemini APIサービスクラス
 */
export class GeminiService {
  private static instance: GeminiService | null = null;
  private genAI: GoogleGenerativeAI | null = null;
  private model: GenerativeModel | null = null;
  private isInitialized = false;

  private constructor() {}

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
  initialize(apiKey: string): void {
    if (!apiKey) {
      throw new Error('APIキーが指定されていません');
    }

    if (this.isInitialized) {
      console.warn('Gemini Service は既に初期化されています');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-preview-05-20',
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      });
      this.isInitialized = true;
      console.log('Gemini Service が正常に初期化されました');
    } catch (error) {
      this.isInitialized = false;
      throw new Error(`Gemini Service の初期化に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
    }
  }

  /**
   * テキストを生成
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
   * サービスが初期化されているかチェック
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}

// 後方互換性のための関数
const geminiService = GeminiService.getInstance();

export function initializeGemini(apiKey: string): void {
  geminiService.initialize(apiKey);
}

export async function generateTextFromGemini(prompt: string): Promise<string> {
  return geminiService.generateText(prompt);
}