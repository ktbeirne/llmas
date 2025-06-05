/**
 * Settings Store - FSD Phase 2
 * 設定ストアの実装（TDD: GREEN Phase）
 */

import type {
  AppSettings,
  SettingsCategory,
  ChatSettings,
  DisplaySettings,
  MouseFollowSettings,
  SettingsValidationError,
  SettingsExportData
} from '../types';

interface SettingsState {
  settings: AppSettings;
  isLoading: boolean;
  error: string | null;
  originalSettings: AppSettings | null; // 変更検出用
}

type SettingsListener = (state: SettingsState) => void;
type CategoryListener<T> = (settings: T) => void;

class SettingsStore {
  private state: SettingsState;
  private listeners = new Set<SettingsListener>();
  private categoryListeners = new Map<SettingsCategory, Set<CategoryListener<any>>>();

  constructor() {
    this.state = {
      settings: this.getDefaultSettings(),
      isLoading: false,
      error: null,
      originalSettings: null
    };
  }

  // デフォルト設定
  getDefaultSettings(): AppSettings {
    return {
      chat: {
        apiProvider: 'gemini',
        apiKey: '',
        systemPrompt: '',
        maxTokens: 2048,
        temperature: 0.7,
        saveHistory: true,
        maxHistoryItems: 100,
        showTimestamp: true,
        fontSize: 'medium',
        theme: 'light'
      },
      display: {
        windowWidth: 400,
        windowHeight: 600,
        alwaysOnTop: true,
        windowOpacity: 1.0,
        defaultPosition: 'bottom-right',
        antialiasing: true,
        shadowQuality: 'medium',
        fps: 30
      },
      expression: {
        enableAutoExpressions: true,
        expressionChangeInterval: 30,
        enableBlink: true,
        blinkIntervalMin: 3,
        blinkIntervalMax: 7,
        expressionIntensity: 1.0,
        customExpressions: {}
      },
      mouseFollow: {
        enabled: true,
        sensitivity: 0.5,
        smoothing: 0.7,
        deadZone: 50,
        updateFrequency: 16
      },
      vrm: {
        modelPath: null,
        animationPath: null,
        modelScale: 1.0,
        enablePhysics: true,
        physicsQuality: 'medium',
        enableSpringBone: true,
        springBoneStiffness: 1.0,
        springBoneDamping: 0.1
      },
      audio: {
        enableTTS: false,
        ttsVoice: '',
        ttsSpeed: 1.0,
        ttsVolume: 1.0,
        enableSoundEffects: true,
        soundEffectsVolume: 0.5
      },
      version: '1.0.0',
      lastUpdated: Date.now()
    };
  }

  // 状態の取得
  getState(): SettingsState {
    return { ...this.state };
  }

  // 設定の読み込み
  async loadSettings(): Promise<void> {
    this.setState({ isLoading: true, error: null });

    try {
      const electronAPI = window.electronAPI;
      
      // 基本設定を読み込み
      const settings = await electronAPI.getSettings();
      
      // 個別設定を読み込み（互換性のため）
      const [, , systemPromptCore] = await Promise.all([
        Promise.resolve(electronAPI.getUserName()).catch(() => 'User'),
        Promise.resolve(electronAPI.getMascotName()).catch(() => 'Mascot'),
        Promise.resolve(electronAPI.getSystemPromptCore()).catch(() => ''),
        Promise.resolve(electronAPI.getTheme()).catch(() => 'light')
      ]);

      // 設定をマージ
      const mergedSettings: AppSettings = {
        ...this.getDefaultSettings(),
        ...settings,
        chat: {
          ...this.getDefaultSettings().chat,
          ...(settings?.chat || {}),
          systemPrompt: systemPromptCore || settings?.chat?.systemPrompt || ''
        },
        lastUpdated: Date.now()
      };

      this.setState({
        settings: mergedSettings,
        isLoading: false,
        error: null,
        originalSettings: JSON.parse(JSON.stringify(mergedSettings))
      });
    } catch {
      this.setState({
        isLoading: false,
        error: 'Failed to load settings'
      });
    }
  }

  // 設定の保存
  async saveSettings(): Promise<boolean> {
    try {
      const result = await window.electronAPI.saveSettings(this.state.settings);
      
      if (result) {
        // 保存成功時は originalSettings を更新
        this.setState({
          originalSettings: JSON.parse(JSON.stringify(this.state.settings))
        });
      }
      
      return true;
    } catch {
      this.setState({
        error: 'Failed to save settings'
      });
      return false;
    }
  }

  // チャット設定の更新
  async updateChatSettings(updates: Partial<ChatSettings>): Promise<void> {
    // originalSettingsがまだ設定されていない場合は設定
    if (!this.state.originalSettings) {
      this.state.originalSettings = JSON.parse(JSON.stringify(this.state.settings));
    }
    
    const newChatSettings = { ...this.state.settings.chat, ...updates };
    
    this.setState({
      settings: {
        ...this.state.settings,
        chat: newChatSettings,
        lastUpdated: Date.now()
      }
    });

    this.notifyCategoryListeners('chat', newChatSettings);
  }

  // 表示設定の更新
  async updateDisplaySettings(updates: Partial<DisplaySettings>): Promise<void> {
    // originalSettingsがまだ設定されていない場合は設定
    if (!this.state.originalSettings) {
      this.state.originalSettings = JSON.parse(JSON.stringify(this.state.settings));
    }
    
    const newDisplaySettings = { ...this.state.settings.display, ...updates };
    
    this.setState({
      settings: {
        ...this.state.settings,
        display: newDisplaySettings,
        lastUpdated: Date.now()
      }
    });

    this.notifyCategoryListeners('display', newDisplaySettings);
  }

  // マウス追従設定の更新
  async updateMouseFollowSettings(updates: Partial<MouseFollowSettings>): Promise<void> {
    // originalSettingsがまだ設定されていない場合は設定
    if (!this.state.originalSettings) {
      this.state.originalSettings = JSON.parse(JSON.stringify(this.state.settings));
    }
    
    const newMouseSettings = { ...this.state.settings.mouseFollow, ...updates };
    
    this.setState({
      settings: {
        ...this.state.settings,
        mouseFollow: newMouseSettings,
        lastUpdated: Date.now()
      }
    });

    this.notifyCategoryListeners('mouseFollow', newMouseSettings);
  }

  // カテゴリ別設定の取得
  getSettingsByCategory(category: SettingsCategory): any {
    return this.state.settings[category];
  }

  // チャット設定のバリデーション
  validateChatSettings(settings: Partial<ChatSettings>): SettingsValidationError[] {
    const errors: SettingsValidationError[] = [];

    if (settings.maxTokens !== undefined) {
      if (settings.maxTokens < 1 || settings.maxTokens > 100000) {
        errors.push({
          category: 'chat',
          key: 'maxTokens',
          message: 'Max tokens must be between 1 and 100000',
          value: settings.maxTokens
        });
      }
    }

    if (settings.temperature !== undefined) {
      if (settings.temperature < 0 || settings.temperature > 2) {
        errors.push({
          category: 'chat',
          key: 'temperature',
          message: 'Temperature must be between 0 and 2',
          value: settings.temperature
        });
      }
    }

    if (settings.maxHistoryItems !== undefined) {
      if (settings.maxHistoryItems < 1 || settings.maxHistoryItems > 1000) {
        errors.push({
          category: 'chat',
          key: 'maxHistoryItems',
          message: 'Max history items must be between 1 and 1000',
          value: settings.maxHistoryItems
        });
      }
    }

    return errors;
  }

  // 表示設定のバリデーション
  validateDisplaySettings(settings: Partial<DisplaySettings>): SettingsValidationError[] {
    const errors: SettingsValidationError[] = [];

    if (settings.windowWidth !== undefined) {
      if (settings.windowWidth < 200 || settings.windowWidth > 2000) {
        errors.push({
          category: 'display',
          key: 'windowWidth',
          message: 'Window width must be between 200 and 2000',
          value: settings.windowWidth
        });
      }
    }

    if (settings.windowHeight !== undefined) {
      if (settings.windowHeight < 300 || settings.windowHeight > 2000) {
        errors.push({
          category: 'display',
          key: 'windowHeight',
          message: 'Window height must be between 300 and 2000',
          value: settings.windowHeight
        });
      }
    }

    if (settings.windowOpacity !== undefined) {
      if (settings.windowOpacity < 0 || settings.windowOpacity > 1) {
        errors.push({
          category: 'display',
          key: 'windowOpacity',
          message: 'Window opacity must be between 0 and 1',
          value: settings.windowOpacity
        });
      }
    }

    return errors;
  }

  // デフォルトにリセット
  async resetToDefaults(): Promise<void> {
    try {
      await window.electronAPI.resetSettings();
      
      const defaultSettings = this.getDefaultSettings();
      this.setState({
        settings: defaultSettings,
        originalSettings: JSON.parse(JSON.stringify(defaultSettings))
      });
    } catch {
      this.setState({
        error: 'Failed to reset settings'
      });
    }
  }

  // カテゴリ別リセット
  async resetCategory(category: SettingsCategory): Promise<void> {
    const defaultSettings = this.getDefaultSettings();
    
    this.setState({
      settings: {
        ...this.state.settings,
        [category]: defaultSettings[category],
        lastUpdated: Date.now()
      }
    });

    this.notifyCategoryListeners(category, defaultSettings[category]);
  }

  // 購読
  subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // カテゴリ別購読
  subscribeToCategory<T>(category: SettingsCategory, listener: CategoryListener<T>): () => void {
    if (!this.categoryListeners.has(category)) {
      this.categoryListeners.set(category, new Set());
    }
    
    const listeners = this.categoryListeners.get(category)!;
    listeners.add(listener);
    
    return () => listeners.delete(listener);
  }

  // 設定のエクスポート
  exportSettings(): SettingsExportData {
    return {
      settings: this.state.settings,
      exportedAt: Date.now(),
      appVersion: this.state.settings.version,
      platform: process.platform || 'unknown'
    };
  }

  // 設定のインポート
  async importSettings(data: SettingsExportData): Promise<boolean> {
    try {
      // バリデーション
      if (!data.settings || typeof data.settings !== 'object') {
        throw new Error('Invalid import data');
      }

      // 各カテゴリのバリデーション
      const chatErrors = this.validateChatSettings(data.settings.chat || {});
      const displayErrors = this.validateDisplaySettings(data.settings.display || {});

      if (chatErrors.length > 0 || displayErrors.length > 0) {
        throw new Error('Invalid import data: validation failed');
      }

      // インポート
      this.setState({
        settings: {
          ...this.getDefaultSettings(),
          ...data.settings,
          lastUpdated: Date.now()
        }
      });

      return true;
    } catch (error) {
      this.setState({
        error: error instanceof Error ? error.message : 'Failed to import settings'
      });
      return false;
    }
  }

  // 変更検出
  hasUnsavedChanges(): boolean {
    if (!this.state.originalSettings) return false;
    
    return JSON.stringify(this.state.settings) !== JSON.stringify(this.state.originalSettings);
  }

  // 変更されたカテゴリの取得
  getChangedCategories(): SettingsCategory[] {
    if (!this.state.originalSettings) return [];
    
    const categories: SettingsCategory[] = ['chat', 'display', 'expression', 'mouseFollow', 'vrm', 'audio'];
    const changed: SettingsCategory[] = [];

    for (const category of categories) {
      if (JSON.stringify(this.state.settings[category]) !== JSON.stringify(this.state.originalSettings[category])) {
        changed.push(category);
      }
    }

    return changed;
  }

  // リセット（テスト用）
  reset(): void {
    this.state = {
      settings: this.getDefaultSettings(),
      isLoading: false,
      error: null,
      originalSettings: null
    };
    this.listeners.clear();
    this.categoryListeners.clear();
  }

  // 内部状態の更新
  private setState(updates: Partial<SettingsState>): void {
    this.state = { ...this.state, ...updates };
    this.notifyListeners();
  }

  // リスナーへの通知
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // カテゴリリスナーへの通知
  private notifyCategoryListeners(category: SettingsCategory, settings: any): void {
    const listeners = this.categoryListeners.get(category);
    if (listeners) {
      listeners.forEach(listener => listener(settings));
    }
  }
}

// シングルトンインスタンス
export const settingsStore = new SettingsStore();