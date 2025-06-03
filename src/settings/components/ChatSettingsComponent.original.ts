/**
 * ChatSettingsComponent
 * 
 * チャット設定を管理するコンポーネント
 * TDD準拠で既存settings-renderer.tsから分離
 */

import type {
  SettingsComponent,
  ChatSettings,
  ChatSettingsElements,
  SettingsStateManager,
  ValidationError,
  SettingsResult
} from '../interfaces/SettingsInterfaces';

import { SYSTEM_PROMPT_LIMITS } from '../interfaces/SettingsInterfaces';
import { validateChatSettings } from '../utils/SettingsValidation';
import {
  safeGetElementById,
  safeGetElementValue,
  safeSetElementValue,
  safeSetDisplay,
  safeAddEventListener,
  safeRemoveEventListener,
  safeTrim,
  showValidationErrors,
  showSuccessMessage,
  showErrorMessage,
  showConfirmDialog,
  handleSettingsResult,
  safeAsyncCall,
  checkElectronAPI,
  checkElectronAPIMethod,
  debounce
} from '../utils/SettingsHelpers';

/**
 * チャット設定コンポーネント
 * 
 * 責務:
 * - ユーザー名・マスコット名設定管理
 * - システムプロンプト編集とリアルタイム文字数カウント
 * - パフォーマンス警告表示制御 (10,000文字超過時)
 * - チャット履歴クリア機能
 * - 設定の保存・読み込み・リセット
 */
export class ChatSettingsComponent implements SettingsComponent {
  private elements: Partial<ChatSettingsElements> = {};
  private currentSettings: Partial<ChatSettings> = {};
  private eventListeners: Array<{
    element: HTMLElement;
    type: string;
    listener: EventListener;
  }> = [];

  // デバウンス済み文字数カウント更新関数
  private debouncedUpdateCharacterCount: () => void;

  constructor(private stateManager?: SettingsStateManager) {
    console.log('[ChatSettingsComponent] Constructor called');
    
    // 文字数カウント更新のデバウンス設定（100ms）
    this.debouncedUpdateCharacterCount = debounce(
      this.updateCharacterCount.bind(this), 
      100
    );
  }

  /**
   * コンポーネントを初期化する
   */
  async initialize(): Promise<void> {
    console.log('[ChatSettingsComponent] Initialize started');
    
    try {
      this.initializeElements();
      this.setupEventListeners();
      await this.loadSettings();
      
      console.log('[ChatSettingsComponent] Initialize completed successfully');
    } catch (error) {
      console.error('[ChatSettingsComponent] Initialize failed:', error);
      throw error;
    }
  }

  /**
   * DOM要素を初期化する
   */
  private initializeElements(): void {
    console.log('[ChatSettingsComponent] Initializing DOM elements');

    // 必須要素の取得
    this.elements = {
      userNameInput: safeGetElementById<HTMLInputElement>('user-name', 'input'),
      mascotNameInput: safeGetElementById<HTMLInputElement>('mascot-name', 'input'),
      systemPromptCoreTextarea: safeGetElementById<HTMLTextAreaElement>('system-prompt-core', 'textarea'),
      promptCharacterCount: safeGetElementById('prompt-character-count', 'span'),
      performanceWarning: safeGetElementById('performance-warning', 'div'),
      resetSystemPromptButton: safeGetElementById<HTMLButtonElement>('reset-system-prompt', 'button'),
      clearChatHistoryButton: safeGetElementById<HTMLButtonElement>('clear-chat-history', 'button'),
      applyButton: safeGetElementById<HTMLButtonElement>('apply-chat-settings', 'button'),
      resetButton: safeGetElementById<HTMLButtonElement>('reset-chat-settings', 'button'),
    };

    // 要素の存在確認
    const missingElements = Object.entries(this.elements)
      .filter(([_, element]) => !element)
      .map(([name, _]) => name);

    if (missingElements.length > 0) {
      console.warn('[ChatSettingsComponent] Missing DOM elements:', missingElements);
    }

    console.log('[ChatSettingsComponent] DOM elements initialized');
  }

  /**
   * イベントリスナーを設定する
   */
  private setupEventListeners(): void {
    console.log('[ChatSettingsComponent] Setting up event listeners');

    // システムプロンプトの入力イベント（文字数カウント更新）
    this.addEventListenerSafely(
      this.elements.systemPromptCoreTextarea,
      'input',
      this.debouncedUpdateCharacterCount
    );

    // システムプロンプトリセットボタン
    this.addEventListenerSafely(
      this.elements.resetSystemPromptButton,
      'click',
      this.resetSystemPrompt.bind(this)
    );

    // チャット履歴クリアボタン
    this.addEventListenerSafely(
      this.elements.clearChatHistoryButton,
      'click',
      this.clearChatHistory.bind(this)
    );

    // 適用ボタン
    this.addEventListenerSafely(
      this.elements.applyButton,
      'click',
      this.applySettings.bind(this)
    );

    // リセットボタン
    this.addEventListenerSafely(
      this.elements.resetButton,
      'click',
      this.resetSettings.bind(this)
    );

    console.log('[ChatSettingsComponent] Event listeners setup completed');
  }

  /**
   * イベントリスナーを安全に追加する
   */
  private addEventListenerSafely(
    element: HTMLElement | null | undefined,
    type: string,
    listener: EventListener
  ): void {
    if (!element) {
      return;
    }

    if (safeAddEventListener(element, type as any, listener)) {
      this.eventListeners.push({ element, type, listener });
    }
  }

  /**
   * 文字数カウントを更新する
   */
  private updateCharacterCount(): void {
    const text = safeGetElementValue(this.elements.systemPromptCoreTextarea);
    const length = text.length;
    
    // 文字数表示更新
    safeSetElementValue(this.elements.promptCharacterCount, length.toString());
    
    // パフォーマンス警告表示制御
    const shouldShowWarning = length > SYSTEM_PROMPT_LIMITS.performanceWarningLength;
    safeSetDisplay(
      this.elements.performanceWarning,
      shouldShowWarning ? 'flex' : 'none'
    );
    
    console.log(`[ChatSettingsComponent] Character count updated: ${length} chars, warning: ${shouldShowWarning}`);
  }

  /**
   * 現在の設定を読み込む
   */
  async loadSettings(): Promise<void> {
    console.log('[ChatSettingsComponent] Loading settings');

    try {
      if (this.stateManager) {
        // StateManager経由で読み込み
        this.currentSettings = await this.stateManager.loadSettings('chat') || {};
      } else if (checkElectronAPI()) {
        // 直接ElectronAPI経由で読み込み
        const [userName, mascotName, systemPrompt] = await Promise.allSettled([
          checkElectronAPIMethod('getUserName') ? window.electronAPI.getUserName() : Promise.resolve('User'),
          checkElectronAPIMethod('getMascotName') ? window.electronAPI.getMascotName() : Promise.resolve('Mascot'),
          checkElectronAPIMethod('getSystemPromptCore') ? window.electronAPI.getSystemPromptCore() : Promise.resolve('')
        ]);

        this.currentSettings = {
          userName: userName.status === 'fulfilled' ? userName.value || 'User' : 'User',
          mascotName: mascotName.status === 'fulfilled' ? mascotName.value || 'Mascot' : 'Mascot',
          systemPrompt: systemPrompt.status === 'fulfilled' ? systemPrompt.value || '' : ''
        };
      }

      this.applySettingsToUI();
      console.log('[ChatSettingsComponent] Settings loaded successfully');
    } catch (error) {
      console.error('[ChatSettingsComponent] Failed to load settings:', error);
      this.loadDefaultSettings();
    }
  }

  /**
   * 設定をUIに反映する
   */
  private applySettingsToUI(): void {
    // ユーザー名の反映
    if (this.currentSettings.userName !== undefined) {
      safeSetElementValue(this.elements.userNameInput, this.currentSettings.userName);
    }
    
    // マスコット名の反映
    if (this.currentSettings.mascotName !== undefined) {
      safeSetElementValue(this.elements.mascotNameInput, this.currentSettings.mascotName);
    }
    
    // システムプロンプトの反映
    if (this.currentSettings.systemPrompt !== undefined) {
      safeSetElementValue(this.elements.systemPromptCoreTextarea, this.currentSettings.systemPrompt);
      this.updateCharacterCount();
    }
  }

  /**
   * デフォルト設定を読み込む
   */
  private loadDefaultSettings(): void {
    console.log('[ChatSettingsComponent] Loading default settings');
    
    this.currentSettings = {
      userName: 'User',
      mascotName: 'Mascot',
      systemPrompt: ''
    };
    
    this.applySettingsToUI();
  }

  /**
   * 現在のUI状態から設定データを取得する
   */
  private getSettingsFromUI(): ChatSettings {
    return {
      userName: safeTrim(safeGetElementValue(this.elements.userNameInput)) || 'User',
      mascotName: safeTrim(safeGetElementValue(this.elements.mascotNameInput)) || 'Mascot',
      systemPrompt: safeTrim(safeGetElementValue(this.elements.systemPromptCoreTextarea))
    };
  }

  /**
   * 設定を適用する
   */
  async applySettings(): Promise<void> {
    console.log('[ChatSettingsComponent] Applying settings');

    const settings = this.getSettingsFromUI();
    
    // バリデーション
    const errors = this.getValidationErrors();
    if (errors.length > 0) {
      showValidationErrors(errors);
      return;
    }

    try {
      let result: SettingsResult;

      if (this.stateManager) {
        // StateManager経由で保存
        result = await this.stateManager.saveSettings('chat', settings);
      } else if (checkElectronAPI()) {
        // 直接ElectronAPI経由で保存（複数API協調処理）
        result = await this.saveAllChatSettings(settings);
      } else {
        throw new Error('設定保存用のAPIが利用できません');
      }

      if (handleSettingsResult(result, '会話設定が保存されました', '会話設定の保存に失敗しました', this.elements.applyButton)) {
        this.currentSettings = { ...settings };
      }
    } catch (error) {
      console.error('[ChatSettingsComponent] Apply settings failed:', error);
      showErrorMessage('設定の適用に失敗しました', error);
    }
  }

  /**
   * 複数のチャット設定APIを協調して保存する
   */
  private async saveAllChatSettings(settings: ChatSettings): Promise<SettingsResult> {
    try {
      const apiCalls = [
        {
          name: 'ユーザー名',
          call: () => checkElectronAPIMethod('setUserName') 
            ? window.electronAPI.setUserName(settings.userName)
            : Promise.resolve(true)
        },
        {
          name: 'マスコット名',
          call: () => checkElectronAPIMethod('setMascotName')
            ? window.electronAPI.setMascotName(settings.mascotName)
            : Promise.resolve(true)
        },
        {
          name: 'システムプロンプト',
          call: () => checkElectronAPIMethod('setSystemPromptCore')
            ? window.electronAPI.setSystemPromptCore(settings.systemPrompt)
            : Promise.resolve(true)
        }
      ];

      console.log('[ChatSettingsComponent] Executing multiple API calls');
      const results = await Promise.allSettled(apiCalls.map(api => api.call()));
      
      // 失敗した処理を確認
      const failures = results
        .map((result, index) => ({ result, api: apiCalls[index] }))
        .filter(({ result }) => result.status === 'rejected');

      if (failures.length > 0) {
        const failedNames = failures.map(f => f.api.name).join(', ');
        console.error('[ChatSettingsComponent] Some API calls failed:', failures);
        return { 
          success: false, 
          error: `${failedNames}の保存に失敗しました` 
        };
      }

      console.log('[ChatSettingsComponent] All API calls succeeded');
      return { success: true };
    } catch (error) {
      console.error('[ChatSettingsComponent] Save all chat settings failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * システムプロンプトをリセットする
   */
  private async resetSystemPrompt(): Promise<void> {
    console.log('[ChatSettingsComponent] Resetting system prompt');

    const confirmReset = showConfirmDialog('システムプロンプトをデフォルトに戻しますか？');
    if (!confirmReset) {
      return;
    }

    try {
      if (checkElectronAPI() && checkElectronAPIMethod('resetSystemPromptCore')) {
        const success = await window.electronAPI.resetSystemPromptCore();
        if (success) {
          await this.loadSettings();
          showSuccessMessage(this.elements.resetSystemPromptButton, 'システムプロンプトがリセットされました');
        } else {
          showErrorMessage('システムプロンプトのリセットに失敗しました');
        }
      } else {
        showErrorMessage('システムプロンプトリセット機能が利用できません');
      }
    } catch (error) {
      console.error('[ChatSettingsComponent] Reset system prompt failed:', error);
      showErrorMessage('システムプロンプトのリセットに失敗しました', error);
    }
  }

  /**
   * チャット履歴をクリアする
   */
  private async clearChatHistory(): Promise<void> {
    console.log('[ChatSettingsComponent] Clearing chat history');

    const confirmClear = showConfirmDialog(
      '本当に会話履歴をすべて削除しますか？この操作は元に戻せません。'
    );
    if (!confirmClear) {
      return;
    }

    try {
      if (checkElectronAPI() && checkElectronAPIMethod('clearChatHistory')) {
        const success = await window.electronAPI.clearChatHistory();
        if (success) {
          showSuccessMessage(this.elements.clearChatHistoryButton, '会話履歴がクリアされました');
        } else {
          showErrorMessage('会話履歴のクリアに失敗しました');
        }
      } else {
        showErrorMessage('会話履歴クリア機能が利用できません');
      }
    } catch (error) {
      console.error('[ChatSettingsComponent] Clear chat history failed:', error);
      showErrorMessage('会話履歴のクリアでエラーが発生しました', error);
    }
  }

  /**
   * 設定をリセットする
   */
  async resetSettings(): Promise<void> {
    console.log('[ChatSettingsComponent] Resetting settings');

    const confirmReset = showConfirmDialog('会話設定をデフォルトに戻しますか？');
    if (!confirmReset) {
      return;
    }

    try {
      let result: SettingsResult;

      if (this.stateManager) {
        // StateManager経由でリセット
        result = await this.stateManager.saveSettings('chat', {
          userName: 'User',
          mascotName: 'Mascot',
          systemPrompt: ''
        });
      } else if (checkElectronAPI()) {
        // 直接ElectronAPI経由でリセット
        result = await this.resetAllChatSettings();
      } else {
        throw new Error('設定リセット用のAPIが利用できません');
      }

      if (handleSettingsResult(result, '会話設定がリセットされました', '会話設定のリセットに失敗しました', this.elements.resetButton)) {
        await this.loadSettings();
        this.restoreFormInteractivity();
      }
    } catch (error) {
      console.error('[ChatSettingsComponent] Reset settings failed:', error);
      showErrorMessage('設定のリセットに失敗しました', error);
    }
  }

  /**
   * 全チャット設定をリセットする
   */
  private async resetAllChatSettings(): Promise<SettingsResult> {
    try {
      const resetCalls = [];
      
      // システムプロンプトリセット
      if (checkElectronAPIMethod('resetSystemPromptCore')) {
        resetCalls.push(window.electronAPI.resetSystemPromptCore());
      }
      
      // ユーザー名・マスコット名をデフォルトに設定
      if (checkElectronAPIMethod('setUserName')) {
        resetCalls.push(window.electronAPI.setUserName('User'));
      }
      
      if (checkElectronAPIMethod('setMascotName')) {
        resetCalls.push(window.electronAPI.setMascotName('Mascot'));
      }

      const results = await Promise.allSettled(resetCalls);
      const failures = results.filter(r => r.status === 'rejected');
      
      if (failures.length > 0) {
        return { 
          success: false, 
          error: `一部の設定リセットに失敗しました: ${failures.length}件`
        };
      }
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * フォーム要素の入力可能状態を復元する
   */
  private restoreFormInteractivity(): void {
    console.log('[ChatSettingsComponent] Restoring form interactivity');
    
    const formElements = [
      this.elements.userNameInput,
      this.elements.mascotNameInput,
      this.elements.systemPromptCoreTextarea
    ];

    formElements.forEach(element => {
      if (element) {
        // 基本属性をリセット
        element.disabled = false;
        element.readOnly = false;
        if (element.hasAttribute('disabled')) element.removeAttribute('disabled');
        if (element.hasAttribute('readonly')) element.removeAttribute('readonly');
        
        // スタイル属性をクリア
        element.style.pointerEvents = '';
        element.style.opacity = '';
        element.style.webkitAppRegion = 'no-drag';
        
        // タブインデックスを設定
        element.tabIndex = 0;
      }
    });

    // 短時間後にフォーカスを設定
    setTimeout(() => {
      if (this.elements.userNameInput && !this.elements.userNameInput.disabled) {
        this.elements.userNameInput.focus();
      }
    }, 100);
  }

  /**
   * バリデーションエラーを取得する
   */
  getValidationErrors(): ValidationError[] {
    const settings = this.getSettingsFromUI();
    return validateChatSettings(settings);
  }

  /**
   * コンポーネントを破棄する
   */
  dispose(): void {
    console.log('[ChatSettingsComponent] Disposing component');

    // イベントリスナーの削除
    this.eventListeners.forEach(({ element, type, listener }) => {
      safeRemoveEventListener(element, type as any, listener);
    });

    this.eventListeners = [];
    this.elements = {};
    this.currentSettings = {};

    console.log('[ChatSettingsComponent] Component disposed');
  }
}

export default ChatSettingsComponent;