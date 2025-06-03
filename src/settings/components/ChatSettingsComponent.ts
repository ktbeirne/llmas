/**
 * ChatSettingsComponent (Phase 2.5 Migration)
 * 
 * チャット設定を管理するコンポーネント
 * BaseSettingsComponentを拡張して統一アーキテクチャを実現
 */

import type { SettingsStateManager } from '../interfaces/SettingsInterfaces';
import type { 
  ChatSettingsData,
  ChatSettingsBindings
} from '../core/BaseTypes';
import type { ChatSettingsElements } from '../types/DOMTypes';

import { BaseSettingsComponent } from '../core/BaseSettingsComponent';
import { SYSTEM_PROMPT_LIMITS } from '../interfaces/SettingsInterfaces';
import { validateChatSettings } from '../utils/SettingsValidation';
import {
  safeGetElementById,
  safeGetElementValue,
  safeSetElementValue,
  safeSetDisplay,
  safeTrim,
  showConfirmDialog,
  checkElectronAPI,
  checkElectronAPIMethod
} from '../utils/SettingsHelpers';

/**
 * チャット設定コンポーネント（Phase 2.5）
 * 
 * 責務:
 * - ユーザー名・マスコット名設定管理
 * - システムプロンプト編集とリアルタイム文字数カウント
 * - パフォーマンス警告表示制御 (10,000文字超過時)
 * - チャット履歴クリア機能
 * - 設定の保存・読み込み・リセット
 * 
 * Phase 2.5 改善点:
 * - BaseSettingsComponent拡張による統一アーキテクチャ
 * - 厳密型使用 (ChatSettingsData)
 * - UIAdapter抽象化レイヤー対応（デバウンス統合）
 * - 統一エラーハンドリング・パフォーマンス管理
 * - ResourceManager活用でメモリリーク防止
 */
export class ChatSettingsComponent extends BaseSettingsComponent<ChatSettingsData, ChatSettingsBindings> {
  private elements: Partial<ChatSettingsElements> = {};

  constructor(stateManager?: SettingsStateManager, uiAdapterType: 'vanilla' | 'react' = 'vanilla') {
    super(stateManager, uiAdapterType);
    console.log('[ChatSettingsComponent] Phase 2.5 constructor completed');
  }

  /**
   * DOM要素を初期化する（BaseSettingsComponent required）
   */
  protected initializeElements(): void {
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
   * UIバインディングを初期化する（optional）
   */
  protected initializeBindings(): ChatSettingsBindings {
    console.log('[ChatSettingsComponent] Initializing UI bindings');

    return {
      userName: this.uiAdapter.bind<string>('user-name', {
        defaultValue: 'User',
        validation: (value) => {
          if (!value || value.trim().length === 0) {
            return [{
              field: 'userName',
              message: 'ユーザー名を入力してください。',
              value
            }];
          }
          return [];
        }
      }),
      mascotName: this.uiAdapter.bind<string>('mascot-name', {
        defaultValue: 'Mascot',
        validation: (value) => {
          if (!value || value.trim().length === 0) {
            return [{
              field: 'mascotName',
              message: 'マスコット名を入力してください。',
              value
            }];
          }
          return [];
        }
      }),
      systemPrompt: this.uiAdapter.bind<string>('system-prompt-core', {
        defaultValue: '',
        onChange: this.handleSystemPromptChange.bind(this),
        debounceMs: 100, // デバウンス100ms
        validation: (value) => {
          if (value.length > SYSTEM_PROMPT_LIMITS.maxLength) {
            return [{
              field: 'systemPrompt',
              message: `システムプロンプトは${SYSTEM_PROMPT_LIMITS.maxLength}文字以下で入力してください。`,
              value
            }];
          }
          return [];
        }
      })
    };
  }

  /**
   * イベントリスナーを設定する（BaseSettingsComponent required）
   */
  protected setupEventListeners(): void {
    console.log('[ChatSettingsComponent] Setting up event listeners');

    // システムプロンプト入力（UIAdapterで管理）
    // デバウンス処理はUIAdapterで自動実行

    // システムプロンプトリセットボタン
    this.addEventListenerSafely(
      'reset-system-prompt',
      'click',
      this.resetSystemPrompt.bind(this)
    );

    // チャット履歴クリアボタン
    this.addEventListenerSafely(
      'clear-chat-history',
      'click',
      this.clearChatHistory.bind(this)
    );

    // 適用・リセットボタンはBaseSettingsComponentで自動処理

    console.log('[ChatSettingsComponent] Event listeners setup completed');
  }

  /**
   * 現在の設定を読み込む（BaseSettingsComponent required）
   */
  protected async loadCurrentSettings(): Promise<void> {
    console.log('[ChatSettingsComponent] Loading current settings');

    try {
      if (this.stateManager) {
        // StateManager経由で読み込み
        this.currentSettings = await this.stateManager.loadSettings('chat') || {};
      } else if (checkElectronAPI()) {
        // 直接ElectronAPI経由で読み込み（複数API協調）
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

      this.applySettingsToUI(this.currentSettings);
      console.log('[ChatSettingsComponent] Settings loaded successfully');
    } catch (error) {
      throw new Error(`設定読み込みに失敗しました: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 現在のUI状態から設定データを取得する（BaseSettingsComponent required）
   */
  protected getSettingsFromUI(): ChatSettingsData {
    return {
      userName: safeTrim(safeGetElementValue(this.elements.userNameInput)) || 'User',
      mascotName: safeTrim(safeGetElementValue(this.elements.mascotNameInput)) || 'Mascot',
      systemPrompt: safeTrim(safeGetElementValue(this.elements.systemPromptCoreTextarea)) || ''
    };
  }

  /**
   * 設定をバリデーションする（BaseSettingsComponent required）
   */
  protected validateSettings(settings: ChatSettingsData): import('../core/BaseTypes').ValidationError[] {
    return validateChatSettings(settings);
  }

  /**
   * デフォルト設定を取得する（BaseSettingsComponent required）
   */
  protected getDefaultSettings(): ChatSettingsData {
    return {
      userName: 'User',
      mascotName: 'Mascot',
      systemPrompt: ''
    };
  }

  /**
   * 設定をUIに反映する（BaseSettingsComponent required）
   */
  protected applySettingsToUI(settings: Partial<ChatSettingsData>): void {
    // ユーザー名の反映
    if (settings.userName !== undefined) {
      safeSetElementValue(this.elements.userNameInput, settings.userName);
    }
    
    // マスコット名の反映
    if (settings.mascotName !== undefined) {
      safeSetElementValue(this.elements.mascotNameInput, settings.mascotName);
    }
    
    // システムプロンプトの反映
    if (settings.systemPrompt !== undefined) {
      safeSetElementValue(this.elements.systemPromptCoreTextarea, settings.systemPrompt);
      this.updateCharacterCount(settings.systemPrompt);
    }
  }

  /**
   * 設定セクション取得（BaseSettingsComponent required）
   */
  protected getSettingsSection(): string {
    return 'chat';
  }

  /**
   * 直接設定保存（BaseSettingsComponent required）
   */
  protected async saveSettingsDirect(settings: ChatSettingsData): Promise<void> {
    if (!checkElectronAPI()) {
      throw new Error('設定保存用のAPIが利用できません');
    }

    // 複数API協調処理
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
      throw new Error(`${failedNames}の保存に失敗しました`);
    }

    console.log('[ChatSettingsComponent] All API calls succeeded');
  }

  /**
   * システムプロンプト変更を処理する
   */
  private handleSystemPromptChange(value: string): void {
    this.updateCharacterCount(value);
  }

  /**
   * 文字数カウントを更新する（UIAdapter統合版）
   */
  private updateCharacterCount(text?: string): void {
    if (!text) {
      text = safeGetElementValue(this.elements.systemPromptCoreTextarea);
    }
    
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
          this.showSuccessMessage('システムプロンプトがリセットされました');
        } else {
          this.showErrorMessage('システムプロンプトのリセットに失敗しました');
        }
      } else {
        this.showErrorMessage('システムプロンプトリセット機能が利用できません');
      }
    } catch (error) {
      this.handleError(error as Error, 'システムプロンプトリセット');
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
          this.showSuccessMessage('会話履歴がクリアされました');
        } else {
          this.showErrorMessage('会話履歴のクリアに失敗しました');
        }
      } else {
        this.showErrorMessage('会話履歴クリア機能が利用できません');
      }
    } catch (error) {
      this.handleError(error as Error, '会話履歴クリア');
    }
  }

  /**
   * 設定適用後処理（optional override）
   */
  protected onSettingsApplied(settings: ChatSettingsData): void {
    console.log('[ChatSettingsComponent] Settings applied successfully:', settings);
    // ツール.json更新やGeminiサービス再初期化など、必要に応じて追加処理
  }

  /**
   * 設定読み込み後処理（optional override）
   */
  protected onSettingsLoaded(settings: Partial<ChatSettingsData>): void {
    console.log('[ChatSettingsComponent] Settings loaded successfully:', settings);
    // 文字数カウント更新
    if (settings.systemPrompt !== undefined) {
      this.updateCharacterCount(settings.systemPrompt);
    }
  }

  /**
   * エラー処理（optional override）
   */
  protected onError(error: Error, operation: string): void {
    console.error(`[ChatSettingsComponent] Error in ${operation}:`, error);
    // コンポーネント固有のエラー処理があれば追加
  }

  /**
   * 設定リセット時の追加処理（optional override）
   */
  protected async executeErrorFallback(operation: string): void {
    if (operation === '設定リセット') {
      // フォーム要素の入力可能状態を復元
      this.restoreFormInteractivity();
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

    // ResourceManager管理下でタイマー設定
    this.resourceManager.safeSetTimeout(() => {
      if (this.elements.userNameInput && !this.elements.userNameInput.disabled) {
        this.elements.userNameInput.focus();
      }
    }, 100);
  }

  /**
   * React移行準備用イベントハンドラー取得
   */
  protected getEventHandlers(): Record<string, Function> {
    return {
      onSystemPromptChange: this.handleSystemPromptChange.bind(this),
      onResetSystemPrompt: this.resetSystemPrompt.bind(this),
      onClearChatHistory: this.clearChatHistory.bind(this),
      onApplySettings: this.applySettings.bind(this),
      onResetSettings: this.resetSettings.bind(this)
    };
  }
}

export default ChatSettingsComponent;