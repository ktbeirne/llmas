/**
 * BaseSettingsComponent
 * 
 * 全設定コンポーネントの統一基底クラス
 * ライフサイクル、エラーハンドリング、パフォーマンス管理、リソース管理を統合
 */

import type { 
  SettingsComponent,
  ValidationError,
  SettingsStateManager
} from '../interfaces/SettingsInterfaces';
import { 
  safeGetElementById,
  checkElectronAPI,
  showErrorMessage,
  showSuccessMessage 
} from '../utils/SettingsHelpers';

import type { 
  UIAdapter,
  EventListenerEntry,
  DisposableResource,
  ErrorStrategy 
} from './BaseTypes';
import PerformanceManager from './PerformanceManager';
import ResourceManager from './ResourceManager';
import ErrorHandler from './ErrorHandler';
import { UIAdapterFactory } from './UIAdapter';

/**
 * 基底設定コンポーネントクラス
 */
export abstract class BaseSettingsComponent<TSettings, TBindings = any> 
  implements SettingsComponent, DisposableResource {
  
  // 状態管理
  protected currentSettings: Partial<TSettings> = {};
  protected isInitialized = false;
  protected isDisposed = false;
  
  // 基盤管理クラス
  protected performanceManager = new PerformanceManager();
  protected resourceManager = new ResourceManager();
  protected uiAdapter: UIAdapter<TBindings>;
  
  // 設定
  protected stateManager?: SettingsStateManager;
  protected componentName: string;

  constructor(
    stateManager?: SettingsStateManager,
    uiAdapterType: 'vanilla' | 'react' = 'vanilla'
  ) {
    this.stateManager = stateManager;
    this.componentName = this.constructor.name;
    this.uiAdapter = UIAdapterFactory.create<TBindings>(uiAdapterType, this.resourceManager);
    
    console.log(`[${this.componentName}] BaseSettingsComponent constructor completed`);
  }

  /**
   * 抽象メソッド - 各コンポーネントで実装必須
   */
  protected abstract initializeElements(): void;
  protected abstract setupEventListeners(): void;
  protected abstract loadCurrentSettings(): Promise<void>;
  protected abstract getSettingsFromUI(): TSettings;
  protected abstract validateSettings(settings: TSettings): ValidationError[];
  protected abstract getDefaultSettings(): TSettings;
  protected abstract applySettingsToUI(settings: Partial<TSettings>): void;

  /**
   * オプション抽象メソッド - 必要に応じて実装
   */
  protected initializeBindings?(): TBindings;
  protected onSettingsLoaded?(settings: Partial<TSettings>): void;
  protected onSettingsApplied?(settings: TSettings): void;
  protected onError?(error: Error, operation: string): void;

  /**
   * 統一された初期化処理
   */
  async initialize(): Promise<void> {
    if (this.isInitialized || this.isDisposed) {
      console.log(`[${this.componentName}] 既に初期化済み、またはリソース解放済み`);
      return;
    }

    const operation = '初期化';
    this.performanceManager.start(`${this.componentName}:${operation}`);

    try {
      console.log(`[${this.componentName}] 初期化開始`);

      // 段階的初期化
      await this.executeInitializationPhases();

      this.isInitialized = true;
      console.log(`[${this.componentName}] 初期化完了`);

    } catch (error) {
      this.handleError(error as Error, operation);
      throw error;
    } finally {
      this.performanceManager.end(`${this.componentName}:${operation}`);
    }
  }

  /**
   * 段階的初期化実行
   */
  private async executeInitializationPhases(): Promise<void> {
    // Phase 1: DOM要素初期化
    console.log(`[${this.componentName}] Phase 1: DOM要素初期化`);
    this.initializeElements();

    // Phase 2: UIバインディング（実装されている場合）
    if (this.initializeBindings) {
      console.log(`[${this.componentName}] Phase 2: UIバインディング`);
      const bindings = this.initializeBindings();
      this.uiAdapter.updateUI(bindings);
    }

    // Phase 3: イベントリスナー設定
    console.log(`[${this.componentName}] Phase 3: イベントリスナー設定`);
    this.setupEventListeners();

    // Phase 4: 設定読み込み
    console.log(`[${this.componentName}] Phase 4: 設定読み込み`);
    await this.loadSettings();

    // Phase 5: 初期化後処理
    console.log(`[${this.componentName}] Phase 5: 初期化後処理`);
    await this.postInitialization();
  }

  /**
   * 初期化後処理（拡張ポイント）
   */
  protected async postInitialization(): Promise<void> {
    // パフォーマンス状況確認
    this.performanceManager.checkMemoryUsage();
    
    // リソース状況確認
    const resourceStatus = this.resourceManager.getResourceStatus();
    console.log(`[${this.componentName}] リソース状況:`, resourceStatus);
  }

  /**
   * 設定読み込み（統一処理）
   */
  async loadSettings(): Promise<void> {
    const operation = '設定読み込み';
    this.performanceManager.start(`${this.componentName}:${operation}`);

    try {
      await this.loadCurrentSettings();
      
      if (this.onSettingsLoaded) {
        this.onSettingsLoaded(this.currentSettings);
      }
      
      console.log(`[${this.componentName}] 設定読み込み完了`);
    } catch (error) {
      this.handleError(error as Error, operation);
      // フォールバック: デフォルト設定を読み込み
      this.currentSettings = this.getDefaultSettings();
      this.applySettingsToUI(this.currentSettings);
    } finally {
      this.performanceManager.end(`${this.componentName}:${operation}`);
    }
  }

  /**
   * 設定適用（統一処理）
   */
  async applySettings(): Promise<void> {
    const operation = '設定適用';
    this.performanceManager.start(`${this.componentName}:${operation}`);

    try {
      const settings = this.getSettingsFromUI();
      
      // バリデーション実行
      const validationErrors = this.validateSettings(settings);
      if (validationErrors.length > 0) {
        this.showValidationErrors(validationErrors);
        return;
      }

      // 設定保存
      await this.saveSettings(settings);
      
      // 現在設定更新
      this.currentSettings = { ...settings };
      
      if (this.onSettingsApplied) {
        this.onSettingsApplied(settings);
      }

      this.showSuccessMessage('設定が正常に保存されました');
      console.log(`[${this.componentName}] 設定適用完了`);

    } catch (error) {
      this.handleError(error as Error, operation);
    } finally {
      this.performanceManager.end(`${this.componentName}:${operation}`);
    }
  }

  /**
   * 設定リセット（統一処理）
   */
  async resetSettings(): Promise<void> {
    const operation = '設定リセット';
    
    if (!this.confirmReset()) {
      return;
    }

    this.performanceManager.start(`${this.componentName}:${operation}`);

    try {
      const defaultSettings = this.getDefaultSettings();
      
      // デフォルト設定を保存
      await this.saveSettings(defaultSettings);
      
      // UI更新
      this.currentSettings = { ...defaultSettings };
      this.applySettingsToUI(this.currentSettings);

      this.showSuccessMessage('設定がリセットされました');
      console.log(`[${this.componentName}] 設定リセット完了`);

    } catch (error) {
      this.handleError(error as Error, operation);
    } finally {
      this.performanceManager.end(`${this.componentName}:${operation}`);
    }
  }

  /**
   * バリデーションエラー取得（統一処理）
   */
  getValidationErrors(): ValidationError[] {
    try {
      const settings = this.getSettingsFromUI();
      return this.validateSettings(settings);
    } catch (error) {
      console.error(`[${this.componentName}] バリデーション取得エラー:`, error);
      return [{
        field: 'general',
        message: 'バリデーションの実行中にエラーが発生しました',
        value: undefined
      }];
    }
  }

  /**
   * リソース解放（統一処理）
   */
  dispose(): void {
    if (this.isDisposed) {
      console.log(`[${this.componentName}] 既にリソース解放済み`);
      return;
    }

    const operation = 'リソース解放';
    console.log(`[${this.componentName}] ${operation}開始`);

    try {
      // UIアダプターのクリーンアップ
      this.uiAdapter.cleanup();
      
      // リソースマネージャーのクリーンアップ
      this.resourceManager.cleanup();
      
      // 状態クリア
      this.currentSettings = {};
      this.isInitialized = false;
      this.isDisposed = true;

      console.log(`[${this.componentName}] ${operation}完了`);
    } catch (error) {
      console.error(`[${this.componentName}] ${operation}エラー:`, error);
    }
  }

  /**
   * 統一エラーハンドリング
   */
  protected handleError(error: Error, operation: string): void {
    const strategy: ErrorStrategy = {
      context: `${this.componentName}:${operation}`,
      showToUser: true,
      retry: false,
      severity: 'medium',
      fallback: () => this.executeErrorFallback(operation)
    };

    ErrorHandler.handle(error, strategy);

    // コンポーネント固有のエラー処理
    if (this.onError) {
      this.onError(error, operation);
    }
  }

  /**
   * エラー時のフォールバック処理
   */
  protected executeErrorFallback(operation: string): void {
    console.log(`[${this.componentName}] フォールバック実行: ${operation}`);
    
    switch (operation) {
      case '初期化':
        // デフォルト設定で初期化継続
        this.currentSettings = this.getDefaultSettings();
        this.applySettingsToUI(this.currentSettings);
        break;
        
      case '設定読み込み':
        // デフォルト設定を適用
        this.currentSettings = this.getDefaultSettings();
        this.applySettingsToUI(this.currentSettings);
        break;
        
      default:
        // 一般的なフォールバック
        console.log(`[${this.componentName}] 一般的フォールバック: ${operation}`);
    }
  }

  /**
   * 統一設定保存処理
   */
  protected async saveSettings(settings: TSettings): Promise<void> {
    if (this.stateManager) {
      // StateManager経由で保存
      const result = await this.stateManager.saveSettings(this.getSettingsSection(), settings);
      if (!result.success) {
        throw new Error(result.error || '設定保存に失敗しました');
      }
    } else {
      // 個別保存処理（各コンポーネントで実装）
      await this.saveSettingsDirect(settings);
    }
  }

  /**
   * 直接設定保存（各コンポーネントで実装）
   */
  protected abstract saveSettingsDirect(settings: TSettings): Promise<void>;

  /**
   * 設定セクション取得（各コンポーネントで実装）
   */
  protected abstract getSettingsSection(): string;

  /**
   * UI関連ヘルパーメソッド
   */
  protected showValidationErrors(errors: ValidationError[]): void {
    const message = errors.length === 1
      ? errors[0].message
      : '以下のエラーがあります:\n' + errors.map(error => `• ${error.message}`).join('\n');
    showErrorMessage(message);
  }

  protected showSuccessMessage(message: string): void {
    showSuccessMessage(null, message);
  }

  protected confirmReset(): boolean {
    return confirm('設定をデフォルトに戻しますか？この操作は元に戻せません。');
  }

  /**
   * 安全なイベントリスナー追加
   */
  protected addEventListenerSafely<K extends keyof HTMLElementEventMap>(
    elementId: string,
    type: K,
    listener: EventListener
  ): void {
    this.uiAdapter.addEventListener(elementId, type, listener);
  }

  /**
   * パフォーマンス情報取得
   */
  getPerformanceInfo(): {
    componentName: string;
    performanceLog: any[];
    resourceStatus: any;
    memoryUsage: any;
  } {
    return {
      componentName: this.componentName,
      performanceLog: this.performanceManager.getPerformanceLog(),
      resourceStatus: this.resourceManager.getResourceStatus(),
      memoryUsage: this.performanceManager.getMemoryUsage()
    };
  }

  /**
   * デバッグ情報取得
   */
  getDebugInfo(): {
    isInitialized: boolean;
    isDisposed: boolean;
    currentSettings: Partial<TSettings>;
    validationErrors: ValidationError[];
    performanceInfo: any;
  } {
    return {
      isInitialized: this.isInitialized,
      isDisposed: this.isDisposed,
      currentSettings: this.currentSettings,
      validationErrors: this.getValidationErrors(),
      performanceInfo: this.getPerformanceInfo()
    };
  }

  /**
   * React移行準備メソッド
   */
  protected prepareForReactMigration(): {
    bindings: TBindings | undefined;
    currentState: Partial<TSettings>;
    eventHandlers: Record<string, Function>;
  } {
    return {
      bindings: this.initializeBindings ? this.initializeBindings() : undefined,
      currentState: this.currentSettings,
      eventHandlers: this.getEventHandlers()
    };
  }

  /**
   * イベントハンドラー取得（React移行準備）
   */
  protected getEventHandlers(): Record<string, Function> {
    // 各コンポーネントで実装
    return {};
  }
}

export default BaseSettingsComponent;