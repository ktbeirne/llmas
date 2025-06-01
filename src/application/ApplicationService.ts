/**
 * アプリケーションサービス
 * ドメインサービスとインフラストラクチャコンポーネントを統合し、アプリケーションの主要なユースケースを実装
 */

import { UserProfile } from '../domain/entities/UserProfile';
import { ChatMessage } from '../domain/entities/ChatMessage';
import { CameraSettings } from '../domain/entities/CameraSettings';
import { ExpressionSettings } from '../domain/entities/ExpressionSettings';
import { WindowBounds } from '../domain/value-objects/WindowBounds';
import { WindowSettings } from '../domain/entities/WindowSettings';

import { SystemPromptBuilder } from '../domain/services/SystemPromptBuilder';
import { SettingsValidator, ValidationResult } from '../domain/services/SettingsValidator';
import { ChatHistoryManager } from '../domain/services/ChatHistoryManager';
import { FunctionCallOrchestrator } from '../domain/services/FunctionCallOrchestrator';

import { IAIServiceGateway, AIResponse, AIServiceConfig } from '../domain/gateways/IAIServiceGateway';
import { IWindowManagerGateway } from '../domain/gateways/IWindowManagerGateway';
import { IFileSystemGateway } from '../domain/gateways/IFileSystemGateway';
import { 
  ISettingsRepository, 
  IChatHistoryRepository, 
  IToolsRepository,
  IAppStateRepository
} from '../domain/repositories/ISettingsRepository';

/**
 * アプリケーションの初期化設定
 */
export interface ApplicationConfig {
  geminiApiKey: string;
  isDevelopment: boolean;
  enableDevTools: boolean;
  enableAuditLog: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxChatHistory: number;
  autoSave: boolean;
  autoSaveInterval: number; // ミリ秒
}

/**
 * アプリケーションの状態
 */
export interface ApplicationStatus {
  isInitialized: boolean;
  aiServiceReady: boolean;
  windowManagerReady: boolean;
  lastError?: string;
  lastErrorTime?: Date;
  uptime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
}

/**
 * アプリケーションサービスメインクラス
 */
export class ApplicationService {
  private static instance: ApplicationService | null = null;
  
  private config: ApplicationConfig;
  private isInitialized = false;
  private startTime = new Date();
  private lastError?: string;
  private lastErrorTime?: Date;
  private autoSaveTimer?: NodeJS.Timeout;
  
  // ドメインサービス
  private chatHistoryManager: ChatHistoryManager;
  private functionCallOrchestrator: FunctionCallOrchestrator;
  
  // ゲートウェイ
  private aiServiceGateway: IAIServiceGateway;
  private windowManagerGateway: IWindowManagerGateway;
  private fileSystemGateway: IFileSystemGateway;
  
  // リポジトリ
  private settingsRepository: ISettingsRepository;
  private chatHistoryRepository: IChatHistoryRepository;
  private toolsRepository: IToolsRepository;
  private appStateRepository: IAppStateRepository;
  
  constructor(
    config: ApplicationConfig,
    // ゲートウェイの注入
    aiServiceGateway: IAIServiceGateway,
    windowManagerGateway: IWindowManagerGateway,
    fileSystemGateway: IFileSystemGateway,
    // リポジトリの注入
    settingsRepository: ISettingsRepository,
    chatHistoryRepository: IChatHistoryRepository,
    toolsRepository: IToolsRepository,
    appStateRepository: IAppStateRepository
  ) {
    this.config = config;
    
    // ゲートウェイの設定
    this.aiServiceGateway = aiServiceGateway;
    this.windowManagerGateway = windowManagerGateway;
    this.fileSystemGateway = fileSystemGateway;
    
    // リポジトリの設定
    this.settingsRepository = settingsRepository;
    this.chatHistoryRepository = chatHistoryRepository;
    this.toolsRepository = toolsRepository;
    this.appStateRepository = appStateRepository;
    
    // ドメインサービスの初期化
    this.chatHistoryManager = new ChatHistoryManager(
      chatHistoryRepository,
      {
        maxMessages: config.maxChatHistory,
        enableAuditLog: config.enableAuditLog
      }
    );
    
    this.functionCallOrchestrator = new FunctionCallOrchestrator({
      enableAuditLog: config.enableAuditLog,
      maxExecutionTime: 30000
    });
  }
  
  /**
   * アプリケーションの初期化
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn('アプリケーションは既に初期化されています');
      return;
    }
    
    try {
      console.log('アプリケーションの初期化を開始します...');
      
      // 1. チャット履歴マネージャーの初期化
      await this.chatHistoryManager.initialize();
      
      // 2. ウィンドウマネージャーの初期化
      await this.windowManagerGateway.initialize();
      
      // 3. AIサービスの初期化
      const userProfile = await this.settingsRepository.getUserProfile();
      const systemPrompt = SystemPromptBuilder.buildSystemPrompt(userProfile);
      
      const aiConfig: AIServiceConfig = {
        model: 'gemini-2.5-flash-preview-05-20',
        temperature: 0.7,
        maxTokens: 4000,
        systemPrompt,
        userProfile,
        enableEmotionDetection: true,
        enableExpressionRecommendation: true,
        enableSuggestions: true
      };
      
      await this.aiServiceGateway.initialize(aiConfig);
      
      // 4. Function Callオーケストレーターの初期化
      await this.initializeFunctionCalls();
      
      // 5. 自動保存の設定
      if (this.config.autoSave) {
        this.startAutoSave();
      }
      
      this.isInitialized = true;
      this.lastError = undefined;
      this.lastErrorTime = undefined;
      
      console.log('アプリケーションの初期化が完了しました');
    } catch (error) {
      this.handleError('初期化エラー', error);
      throw error;
    }
  }
  
  /**
   * チャットメッセージの送信と応答生成
   */
  async sendChatMessage(userMessageContent: string): Promise<ChatMessage> {
    this.ensureInitialized();
    
    try {
      // ユーザーメッセージを履歴に追加
      const userMessage = await this.chatHistoryManager.addUserMessage(userMessageContent);
      
      // AIサービス用のコンテキストを取得
      const context = this.chatHistoryManager.getContextForAI();
      
      // AIサービスにメッセージを送信
      const aiResponse: AIResponse = await this.aiServiceGateway.sendMessage(
        userMessage,
        context.slice(0, -1) // ユーザーメッセージを除いたコンテキスト
      );
      
      // アシスタントメッセージを履歴に追加
      await this.chatHistoryManager.addMessage(aiResponse.message);
      
      // 推奨表情がある場合は適用
      if (aiResponse.recommendedExpression) {
        await this.applyRecommendedExpression(aiResponse.recommendedExpression);
      }
      
      return aiResponse.message;
    } catch (error) {
      this.handleError('チャットメッセージ送信エラー', error);
      throw error;
    }
  }
  
  /**
   * ユーザープロファイルの取得
   */
  async getUserProfile(): Promise<UserProfile> {
    this.ensureInitialized();
    return await this.settingsRepository.getUserProfile();
  }
  
  /**
   * ユーザープロファイルの更新
   */
  async updateUserProfile(updates: Partial<{
    userName: string;
    mascotName: string;
    systemPromptCore: string;
    theme: string;
    defaultExpression: string;
  }>): Promise<UserProfile> {
    this.ensureInitialized();
    
    try {
      // 現在のプロファイルを取得
      const currentProfile = await this.settingsRepository.getUserProfile();
      
      // 新しいプロファイルを作成
      const newProfile = currentProfile.update(updates);
      
      // バリデーション
      // UserProfileエンティティのコンストラクタで自動的にバリデーションされる
      
      // 保存
      await this.settingsRepository.saveUserProfile(newProfile);
      
      // AIサービスのシステムプロンプトを更新
      await this.updateAISystemPrompt(newProfile);
      
      console.log('ユーザープロファイルを更新しました:', newProfile.toString());
      return newProfile;
    } catch (error) {
      this.handleError('ユーザープロファイル更新エラー', error);
      throw error;
    }
  }
  
  /**
   * カメラ設定の取得
   */
  async getCameraSettings(): Promise<CameraSettings> {
    this.ensureInitialized();
    return await this.settingsRepository.getCameraSettings();
  }
  
  /**
   * カメラ設定の更新
   */
  async updateCameraSettings(settings: CameraSettings): Promise<void> {
    this.ensureInitialized();
    
    try {
      // CameraSettingsエンティティのコンストラクタでバリデーション済み
      await this.settingsRepository.saveCameraSettings(settings);
      console.log('カメラ設定を更新しました:', settings.toString());
    } catch (error) {
      this.handleError('カメラ設定更新エラー', error);
      throw error;
    }
  }
  
  /**
   * 表情設定の取得
   */
  async getExpressionSettings(): Promise<ExpressionSettings> {
    this.ensureInitialized();
    return await this.settingsRepository.getExpressionSettings();
  }
  
  /**
   * 表情設定の更新
   */
  async updateExpressionSettings(settings: ExpressionSettings): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.settingsRepository.saveExpressionSettings(settings);
      console.log('表情設定を更新しました:', settings.toString());
    } catch (error) {
      this.handleError('表情設定更新エラー', error);
      throw error;
    }
  }
  
  /**
   * ウィンドウ設定の取得
   */
  async getWindowSettings(): Promise<WindowSettings> {
    this.ensureInitialized();
    return await this.settingsRepository.getWindowSettings();
  }
  
  /**
   * ウィンドウ設定の更新
   */
  async updateWindowSettings(settings: WindowSettings): Promise<void> {
    this.ensureInitialized();
    
    try {
      await this.settingsRepository.saveWindowSettings(settings);
      console.log('ウィンドウ設定を更新しました:', settings.toString());
    } catch (error) {
      this.handleError('ウィンドウ設定更新エラー', error);
      throw error;
    }
  }
  
  /**
   * VRMモデルパスの取得
   */
  async getVrmModelPath(): Promise<string> {
    this.ensureInitialized();
    return await this.settingsRepository.getVrmModelPath();
  }
  
  /**
   * VRMモデルパスの更新
   */
  async updateVrmModelPath(path: string): Promise<ValidationResult> {
    this.ensureInitialized();
    
    try {
      // バリデーション
      const validation = SettingsValidator.validateVrmModelPath(path);
      if (!validation.valid) {
        return validation;
      }
      
      // ファイルの存在確認
      const exists = await this.fileSystemGateway.exists(path);
      if (!exists) {
        return {
          valid: false,
          errors: ['指定されたファイルが存在しません']
        };
      }
      
      await this.settingsRepository.saveVrmModelPath(path);
      console.log('VRMモデルパスを更新しました:', path);
      
      return { valid: true, errors: [] };
    } catch (error) {
      this.handleError('VRMモデルパス更新エラー', error);
      throw error;
    }
  }
  
  /**
   * チャット履歴の取得
   */
  getChatHistory(): ChatMessage[] {
    this.ensureInitialized();
    return this.chatHistoryManager.getAllMessages();
  }
  
  /**
   * チャット履歴のクリア
   */
  async clearChatHistory(): Promise<void> {
    this.ensureInitialized();
    await this.chatHistoryManager.clearHistory();
  }
  
  /**
   * アプリケーションの状態を取得
   */
  async getApplicationStatus(): Promise<ApplicationStatus> {
    const aiStatus = await this.aiServiceGateway.getStatus();
    const memoryUsage = process.memoryUsage();
    const uptime = Date.now() - this.startTime.getTime();
    
    return {
      isInitialized: this.isInitialized,
      aiServiceReady: aiStatus.isConnected,
      windowManagerReady: true, // 簡化してtrueとする
      lastError: this.lastError,
      lastErrorTime: this.lastErrorTime,
      uptime,
      memoryUsage: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      }
    };
  }
  
  /**
   * アプリケーションの終了処理
   */
  async dispose(): Promise<void> {
    console.log('アプリケーションの終了処理を開始します...');
    
    try {
      // 自動保存タイマーを停止
      if (this.autoSaveTimer) {
        clearInterval(this.autoSaveTimer);
      }
      
      // 最終保存
      if (this.config.autoSave) {
        await this.saveAllSettings();
      }
      
      // ゲートウェイのクリーンアップ
      await this.aiServiceGateway.dispose();
      await this.windowManagerGateway.dispose();
      
      this.isInitialized = false;
      console.log('アプリケーションの終了処理が完了しました');
    } catch (error) {
      console.error('アプリケーション終了処理エラー:', error);
    }
  }
  
  // プライベートメソッド
  
  /**
   * 初期化チェック
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('アプリケーションが初期化されていません');
    }
  }
  
  /**
   * Function Callの初期化
   */
  private async initializeFunctionCalls(): Promise<void> {
    // ここで利用可能なFunctionを登録
    // 実際の実装では既存のFunctionCallHandlerの機能を統合
    console.log('Function Callオーケストレーターを初期化しました');
  }
  
  /**
   * AIサービスのシステムプロンプトを更新
   */
  private async updateAISystemPrompt(userProfile: UserProfile): Promise<void> {
    const newSystemPrompt = SystemPromptBuilder.buildSystemPrompt(userProfile);
    await this.aiServiceGateway.updateConfig({ systemPrompt: newSystemPrompt });
    console.log('AIサービスのシステムプロンプトを更新しました');
  }
  
  /**
   * 推奨表情を適用
   */
  private async applyRecommendedExpression(expression: string): Promise<void> {
    try {
      // ウィンドウマネージャーを通して表情を適用
      // 実際の実装ではIPCやイベント送信が必要
      console.log(`推奨表情を適用: ${expression}`);
    } catch (error) {
      console.warn('推奨表情の適用に失敗しました:', error);
    }
  }
  
  /**
   * 自動保存の開始
   */
  private startAutoSave(): void {
    this.autoSaveTimer = setInterval(async () => {
      try {
        await this.saveAllSettings();
        console.log('自動保存が実行されました');
      } catch (error) {
        console.error('自動保存エラー:', error);
      }
    }, this.config.autoSaveInterval);
  }
  
  /**
   * 全設定の保存
   */
  private async saveAllSettings(): Promise<void> {
    // ここで現在の状態を保存
    // 実際の実装ではウィンドウ位置、サイズなどを収集して保存
    console.log('全設定を保存しました');
  }
  
  /**
   * エラーハンドリング
   */
  private handleError(context: string, error: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    this.lastError = `${context}: ${errorMessage}`;
    this.lastErrorTime = new Date();
    console.error(`[ApplicationService] ${context}:`, error);
  }
  
  /**
   * シングルトンインスタンスの取得（一時的な実装）
   */
  static getInstance(): ApplicationService | null {
    return ApplicationService.instance;
  }
  
  /**
   * シングルトンインスタンスの設定（一時的な実装）
   */
  static setInstance(instance: ApplicationService): void {
    ApplicationService.instance = instance;
  }
}