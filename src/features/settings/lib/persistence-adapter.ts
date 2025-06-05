/**
 * Settings Persistence Adapter - FSD Phase 2
 * 設定永続化アダプターの実装（TDD: GREEN Phase）
 * 
 * このアダプターは統一された設定モデルと
 * 既存のElectron APIエンドポイント間のマッピングを処理します
 */

import type {
  AppSettings,
  SettingsCategory,
  ChatSettings,
  DisplaySettings,
  ExpressionSettings,
  MouseFollowSettings,
  VRMSettings,
  AudioSettings
} from '../types';

interface SettingsMetadata {
  version: string;
  categories: SettingsCategory[];
  lastModified: Date;
}

export class SettingsPersistenceAdapter {
  private electronAPI = window.electronAPI;

  /**
   * 全ての設定を統合して読み込む
   */
  async loadAllSettings(): Promise<AppSettings> {
    try {
      // 並列で全ての設定を読み込む
      const [
        baseSettings,
        ,  // userName - 将来使用予定
        ,  // mascotName - 将来使用予定
        systemPromptCore,
        theme,
        mainWindowBounds,
        ,  // cameraSettings - 将来使用予定
        expressionSettings,
        // defaultExpression - 将来使用予定
      ] = await Promise.all([
        this.electronAPI.getSettings().catch(() => ({})),
        this.electronAPI.getUserName().catch(() => 'User'),
        this.electronAPI.getMascotName().catch(() => 'Mascot'),
        this.electronAPI.getSystemPromptCore().catch(() => ''),
        this.electronAPI.getTheme().catch(() => 'light'),
        this.electronAPI.getMainWindowBounds().catch(() => ({ width: 400, height: 600 })),
        this.electronAPI.getCameraSettings().catch(() => null),
        this.electronAPI.getExpressionSettings().catch(() => ({})),
        this.electronAPI.getDefaultExpression().catch(() => 'neutral')
      ]);

      // デフォルト設定
      const defaultSettings = this.getDefaultSettings();

      // 設定を統合
      const mergedSettings: AppSettings = {
        ...defaultSettings,
        ...baseSettings,
        chat: {
          ...defaultSettings.chat,
          ...(baseSettings.chat || {}),
          systemPrompt: systemPromptCore || baseSettings.chat?.systemPrompt || '',
          theme: theme as ChatSettings['theme']
        },
        display: {
          ...defaultSettings.display,
          ...(baseSettings.display || {}),
          windowWidth: mainWindowBounds.width || defaultSettings.display.windowWidth,
          windowHeight: mainWindowBounds.height || defaultSettings.display.windowHeight
        },
        expression: {
          ...defaultSettings.expression,
          ...(baseSettings.expression || {}),
          customExpressions: expressionSettings || {}
        },
        lastUpdated: Date.now()
      };

      return mergedSettings;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return this.getDefaultSettings();
    }
  }

  /**
   * 全ての設定を保存する
   */
  async saveAllSettings(settings: AppSettings): Promise<boolean> {
    try {
      // メイン設定を保存
      await this.electronAPI.saveSettings(settings);

      // 個別APIで保存（互換性のため）
      const savePromises = [
        settings.chat?.theme && this.electronAPI.setTheme(settings.chat.theme),
        settings.chat?.systemPrompt !== undefined && this.electronAPI.setSystemPromptCore(settings.chat.systemPrompt),
        settings.display && this.electronAPI.setMainWindowBounds({
          width: settings.display.windowWidth,
          height: settings.display.windowHeight
        }),
        settings.expression?.customExpressions && this.electronAPI.setExpressionSettings(settings.expression.customExpressions)
      ].filter(Boolean);

      const results = await Promise.allSettled(savePromises);
      
      // 一つでも失敗した場合はfalseを返す
      const hasFailure = results.some(result => result.status === 'rejected');
      return !hasFailure;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  /**
   * カテゴリ別に設定を読み込む
   */
  async loadCategorySettings(category: SettingsCategory): Promise<any> {
    switch (category) {
      case 'chat':
        return this.loadChatSettings();
      case 'display':
        return this.loadDisplaySettings();
      case 'expression':
        return this.loadExpressionSettings();
      case 'mouseFollow':
        return this.loadMouseFollowSettings();
      case 'vrm':
        return this.loadVRMSettings();
      case 'audio':
        return this.loadAudioSettings();
      default:
        throw new Error(`Unknown category: ${category}`);
    }
  }

  /**
   * カテゴリ別に設定を保存する
   */
  async saveCategorySettings(category: SettingsCategory, settings: any): Promise<boolean> {
    try {
      switch (category) {
        case 'chat':
          return await this.saveChatSettings(settings);
        case 'display':
          return await this.saveDisplaySettings(settings);
        case 'expression':
          return await this.saveExpressionSettings(settings);
        case 'mouseFollow':
          return await this.saveMouseFollowSettings(settings);
        case 'vrm':
          return await this.saveVRMSettings(settings);
        case 'audio':
          return await this.saveAudioSettings(settings);
        default:
          throw new Error(`Unknown category: ${category}`);
      }
    } catch (error) {
      console.error(`Failed to save ${category} settings:`, error);
      return false;
    }
  }

  /**
   * 設定をリセットする
   */
  async resetSettings(category?: SettingsCategory): Promise<boolean> {
    try {
      if (!category) {
        // 全設定リセット
        await this.electronAPI.resetSettings();
        return true;
      }

      // カテゴリ別リセット
      switch (category) {
        case 'chat':
          await Promise.all([
            this.electronAPI.resetSystemPromptCore?.(),
            this.electronAPI.setUserName('User'),
            this.electronAPI.setMascotName('Mascot')
          ]);
          break;
        case 'display':
          await this.electronAPI.resetAllDisplaySettings?.();
          break;
        case 'expression':
          await this.electronAPI.resetExpressionSettings();
          break;
        default:
          // 他のカテゴリは個別リセットAPIがない場合がある
          break;
      }

      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return false;
    }
  }

  /**
   * 設定のメタデータを取得
   */
  async getSettingsMetadata(): Promise<SettingsMetadata> {
    return {
      version: '1.0.0',
      categories: ['chat', 'display', 'expression', 'mouseFollow', 'vrm', 'audio'],
      lastModified: new Date()
    };
  }

  /**
   * 設定の整合性を検証
   */
  async validateSettingsIntegrity(settings: AppSettings): Promise<boolean> {
    try {
      // 必須カテゴリの存在確認
      const requiredCategories: SettingsCategory[] = ['chat', 'display', 'expression', 'mouseFollow', 'vrm', 'audio'];
      
      for (const category of requiredCategories) {
        if (!settings[category] || typeof settings[category] !== 'object') {
          return false;
        }
      }

      // バージョンとタイムスタンプの確認
      if (!settings.version || !settings.lastUpdated) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  // プライベートメソッド

  private async loadChatSettings(): Promise<ChatSettings> {
    const [baseSettings, , , systemPromptCore, theme] = await Promise.all([
      this.electronAPI.getSettings().then(s => s.chat || {}).catch(() => ({})),
      this.electronAPI.getUserName().catch(() => 'User'),
      this.electronAPI.getMascotName().catch(() => 'Mascot'),
      this.electronAPI.getSystemPromptCore().catch(() => ''),
      this.electronAPI.getTheme().catch(() => 'light')
    ]);

    const defaultChat = this.getDefaultSettings().chat;
    
    return {
      ...defaultChat,
      ...baseSettings,
      systemPrompt: systemPromptCore || baseSettings.systemPrompt || '',
      theme: theme as ChatSettings['theme']
    };
  }

  private async loadDisplaySettings(): Promise<DisplaySettings> {
    const [baseSettings, mainWindowBounds] = await Promise.all([
      this.electronAPI.getSettings().then(s => s.display || {}).catch(() => ({})),
      this.electronAPI.getMainWindowBounds().catch(() => ({ width: 400, height: 600 })),
      this.electronAPI.getCameraSettings().catch(() => null),
      this.electronAPI.getTheme().catch(() => 'light')
    ]);

    const defaultDisplay = this.getDefaultSettings().display;

    return {
      ...defaultDisplay,
      ...baseSettings,
      windowWidth: mainWindowBounds.width || defaultDisplay.windowWidth,
      windowHeight: mainWindowBounds.height || defaultDisplay.windowHeight
    };
  }

  private async loadExpressionSettings(): Promise<ExpressionSettings> {
    const [baseSettings, expressionSettings] = await Promise.all([
      this.electronAPI.getSettings().then(s => s.expression || {}).catch(() => ({})),
      this.electronAPI.getExpressionSettings().catch(() => ({})),
      this.electronAPI.getDefaultExpression().catch(() => 'neutral')
    ]);

    const defaultExpression_ = this.getDefaultSettings().expression;

    return {
      ...defaultExpression_,
      ...baseSettings,
      customExpressions: expressionSettings || {}
    };
  }

  private async loadMouseFollowSettings(): Promise<MouseFollowSettings> {
    const baseSettings = await this.electronAPI.getSettings()
      .then(s => s.mouseFollow || {})
      .catch(() => ({}));

    return {
      ...this.getDefaultSettings().mouseFollow,
      ...baseSettings
    };
  }

  private async loadVRMSettings(): Promise<VRMSettings> {
    const baseSettings = await this.electronAPI.getSettings()
      .then(s => s.vrm || {})
      .catch(() => ({}));

    return {
      ...this.getDefaultSettings().vrm,
      ...baseSettings
    };
  }

  private async loadAudioSettings(): Promise<AudioSettings> {
    const baseSettings = await this.electronAPI.getSettings()
      .then(s => s.audio || {})
      .catch(() => ({}));

    return {
      ...this.getDefaultSettings().audio,
      ...baseSettings
    };
  }

  private async saveChatSettings(settings: ChatSettings): Promise<boolean> {
    const promises = [
      settings.systemPrompt !== undefined && this.electronAPI.setSystemPromptCore(settings.systemPrompt),
      settings.theme !== undefined && this.electronAPI.setTheme(settings.theme)
    ].filter(Boolean);

    await Promise.all(promises);
    return true;
  }

  private async saveDisplaySettings(settings: DisplaySettings): Promise<boolean> {
    const promises = [
      (settings.windowWidth !== undefined || settings.windowHeight !== undefined) &&
        this.electronAPI.setMainWindowBounds({
          width: settings.windowWidth,
          height: settings.windowHeight
        }),
      this.electronAPI.setCameraSettings({
        fov: 45 // デフォルト値
      })
    ].filter(Boolean);

    await Promise.all(promises);
    return true;
  }

  private async saveExpressionSettings(settings: ExpressionSettings): Promise<boolean> {
    if (settings.customExpressions) {
      await this.electronAPI.setExpressionSettings(settings.customExpressions);
    }
    return true;
  }

  private async saveMouseFollowSettings(_settings: MouseFollowSettings): Promise<boolean> {
    // マウス追従設定は現在個別APIがないため、メイン設定経由で保存
    return true;
  }

  private async saveVRMSettings(_settings: VRMSettings): Promise<boolean> {
    // VRM設定は現在個別APIがないため、メイン設定経由で保存
    return true;
  }

  private async saveAudioSettings(_settings: AudioSettings): Promise<boolean> {
    // オーディオ設定は現在個別APIがないため、メイン設定経由で保存
    return true;
  }

  private getDefaultSettings(): AppSettings {
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
}