/**
 * 依存性注入コンテナ
 * アプリケーションの全ての依存関係を配線し、Clean Architectureの原則を維持
 */

import { ApplicationService, ApplicationConfig } from '../application/ApplicationService';

// ゲートウェイのインフラ実装
// import { ElectronWindowManagerGateway } from './gateways/ElectronWindowManagerGateway';
// import { NodeFileSystemGateway } from './gateways/NodeFileSystemGateway';

// リポジトリのインフラ実装
// import { ElectronStoreSettingsRepository } from './repositories/ElectronStoreSettingsRepository';
// import { ElectronStoreChatHistoryRepository } from './repositories/ElectronStoreChatHistoryRepository';
// import { FileSystemToolsRepository } from './repositories/FileSystemToolsRepository';
// import { ElectronStoreAppStateRepository } from './repositories/ElectronStoreAppStateRepository';

// 既存のクラス（一時的なアダプターとして使用）
import { SettingsStore } from '../utils/settingsStore';
import { ChatHistoryStore } from '../utils/chatHistoryStore';
import { ToolsService } from '../services/toolsService';
import { WindowManager } from '../utils/WindowManager';

import { GeminiServiceGateway } from './gateways/GeminiServiceGateway';

// アダプタークラス（既存クラスをインターフェースに合わせる）
import { SettingsStoreAdapter } from './adapters/SettingsStoreAdapter';
import { ChatHistoryStoreAdapter } from './adapters/ChatHistoryStoreAdapter';
import { ToolsServiceAdapter } from './adapters/ToolsServiceAdapter';
import { WindowManagerAdapter } from './adapters/WindowManagerAdapter';
import { NodeFileSystemAdapter } from './adapters/NodeFileSystemAdapter';

/**
 * DIコンテナの設定
 */
export interface DIContainerConfig {
  geminiApiKey: string;
  isDevelopment: boolean;
  enableDevTools: boolean;
  enableAuditLog: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  maxChatHistory: number;
  autoSave: boolean;
  autoSaveInterval: number;
}

/**
 * 依存性注入コンテナ
 */
export class DIContainer {
  private static instance: DIContainer | null = null;
  private applicationService: ApplicationService | null = null;
  private isInitialized = false;
  
  private constructor() {}
  
  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }
  
  /**
   * コンテナの初期化
   */
  async initialize(config: DIContainerConfig): Promise<void> {
    if (this.isInitialized) {
      console.warn('DIコンテナは既に初期化されています');
      return;
    }
    
    try {
      console.log('DIコンテナの初期化を開始します...');
      
      // 1. インフラストラクチャコンポーネントの作成
      const { gateways, repositories } = this.createInfrastructureComponents(config);
      
      // 2. アプリケーション設定の作成
      const applicationConfig: ApplicationConfig = {
        geminiApiKey: config.geminiApiKey,
        isDevelopment: config.isDevelopment,
        enableDevTools: config.enableDevTools,
        enableAuditLog: config.enableAuditLog,
        logLevel: config.logLevel,
        maxChatHistory: config.maxChatHistory,
        autoSave: config.autoSave,
        autoSaveInterval: config.autoSaveInterval
      };
      
      // 3. ApplicationServiceの作成
      this.applicationService = new ApplicationService(
        applicationConfig,
        gateways.aiService,
        gateways.windowManager,
        gateways.fileSystem,
        repositories.settings,
        repositories.chatHistory,
        repositories.tools,
        repositories.appState
      );
      
      // 4. ApplicationServiceをシングルトンとして設定（一時的）
      ApplicationService.setInstance(this.applicationService);
      
      this.isInitialized = true;
      console.log('DIコンテナの初期化が完了しました');
    } catch (error) {
      console.error('DIコンテナの初期化に失敗しました:', error);
      throw error;
    }
  }
  
  /**
   * ApplicationServiceを取得
   */
  getApplicationService(): ApplicationService {
    if (!this.isInitialized || !this.applicationService) {
      throw new Error('DIコンテナが初期化されていません');
    }
    return this.applicationService;
  }
  
  /**
   * コンテナのクリーンアップ
   */
  async dispose(): Promise<void> {
    if (this.applicationService) {
      await this.applicationService.dispose();
      this.applicationService = null;
    }
    this.isInitialized = false;
    console.log('DIコンテナがクリーンアップされました');
  }
  
  /**
   * インフラストラクチャコンポーネントの作成
   */
  private createInfrastructureComponents(config: DIContainerConfig) {
    // 既存のクラスのインスタンスを作成
    const settingsStore = new SettingsStore();
    const chatHistoryStore = new ChatHistoryStore();
    const toolsService = ToolsService.getInstance();
    const windowManager = new WindowManager();
    
    // ゲートウェイの作成
    const gateways = {
      aiService: new GeminiServiceGateway(),
      windowManager: new WindowManagerAdapter(windowManager),
      fileSystem: new NodeFileSystemAdapter()
    };
    
    // リポジトリの作成（アダプターパターンで既存クラスをラップ）
    const repositories = {
      settings: new SettingsStoreAdapter(settingsStore),
      chatHistory: new ChatHistoryStoreAdapter(chatHistoryStore),
      tools: new ToolsServiceAdapter(toolsService),
      appState: new SettingsStoreAdapter(settingsStore) // 一時的にSettingsStoreを再利用
    };
    
    return { gateways, repositories };
  }
}