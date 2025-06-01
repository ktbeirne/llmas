/**
 * SettingsStoreをISettingsRepositoryインターフェースにアダプトするアダプター
 * 既存のSettingsStoreを新しいアーキテクチャに統合するためのブリッジ
 */

import { 
  ISettingsRepository, 
  IAppStateRepository 
} from '../../domain/repositories/ISettingsRepository';
import { UserProfile } from '../../domain/entities/UserProfile';
import { CameraSettings } from '../../domain/entities/CameraSettings';
import { ExpressionSettings } from '../../domain/entities/ExpressionSettings';
import { WindowBounds } from '../../domain/value-objects/WindowBounds';
import { WindowSettings } from '../../domain/entities/WindowSettings';
import { SettingsStore } from '../../utils/settingsStore';

/**
 * SettingsStoreアダプター
 */
export class SettingsStoreAdapter implements ISettingsRepository, IAppStateRepository {
  constructor(private settingsStore: SettingsStore) {}

  // ISettingsRepositoryの実装

  async getUserProfile(): Promise<UserProfile> {
    const userName = this.settingsStore.getUserName();
    const mascotName = this.settingsStore.getMascotName();
    const systemPromptCore = this.settingsStore.getSystemPromptCore();
    const theme = this.settingsStore.getTheme();
    const defaultExpression = this.settingsStore.getDefaultExpression();

    return new UserProfile({
      userName,
      mascotName,
      systemPromptCore,
      theme,
      defaultExpression
    });
  }

  async saveUserProfile(profile: UserProfile): Promise<void> {
    this.settingsStore.setUserName(profile.userName);
    this.settingsStore.setMascotName(profile.mascotName);
    this.settingsStore.setSystemPromptCore(profile.systemPromptCore);
    this.settingsStore.setTheme(profile.theme);
    this.settingsStore.setDefaultExpression(profile.defaultExpression);
  }

  async getCameraSettings(): Promise<CameraSettings> {
    const settings = this.settingsStore.getCameraSettings();
    return CameraSettings.fromPlainObject(settings);
  }

  async saveCameraSettings(settings: CameraSettings): Promise<void> {
    this.settingsStore.setCameraSettings(settings.toPlainObject());
  }

  async getExpressionSettings(): Promise<ExpressionSettings> {
    const settings = this.settingsStore.getExpressionSettings();
    return ExpressionSettings.fromPlainObject(settings);
  }

  async saveExpressionSettings(settings: ExpressionSettings): Promise<void> {
    this.settingsStore.setExpressionSettings(settings.toPlainObject());
  }

  async getWindowSettings(): Promise<WindowSettings> {
    const windowSize = this.settingsStore.getWindowSize();
    return WindowSettings.fromPlainObject({
      defaultSize: {
        width: windowSize.width,
        height: windowSize.height
      },
      preset: windowSize.preset as 'small' | 'medium' | 'large'
    });
  }

  async saveWindowSettings(settings: WindowSettings): Promise<void> {
    const plainObject = settings.toPlainObject();
    this.settingsStore.setWindowSize({
      width: plainObject.defaultSize.width,
      height: plainObject.defaultSize.height,
      preset: plainObject.preset
    });
  }

  async getMainWindowBounds(): Promise<WindowBounds | null> {
    const bounds = this.settingsStore.getMainWindowBounds();
    if (!bounds) return null;
    return new WindowBounds(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  async saveMainWindowBounds(bounds: WindowBounds): Promise<void> {
    this.settingsStore.setMainWindowBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    });
  }

  async getChatWindowBounds(): Promise<WindowBounds | null> {
    const bounds = this.settingsStore.getChatWindowBounds();
    if (!bounds) return null;
    return new WindowBounds(bounds.x, bounds.y, bounds.width, bounds.height);
  }

  async saveChatWindowBounds(bounds: WindowBounds): Promise<void> {
    this.settingsStore.setChatWindowBounds({
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    });
  }

  async getChatWindowVisible(): Promise<boolean> {
    return this.settingsStore.getChatWindowVisible();
  }

  async saveChatWindowVisible(visible: boolean): Promise<void> {
    this.settingsStore.setChatWindowVisible(visible);
  }

  async getVrmModelPath(): Promise<string> {
    return this.settingsStore.getVrmModelPath();
  }

  async saveVrmModelPath(path: string): Promise<void> {
    this.settingsStore.setVrmModelPath(path);
  }

  async getAllSettings(): Promise<{
    userProfile: UserProfile;
    cameraSettings: CameraSettings;
    expressionSettings: ExpressionSettings;
    windowSettings: WindowSettings;
    mainWindowBounds: WindowBounds | null;
    chatWindowBounds: WindowBounds | null;
    chatWindowVisible: boolean;
    vrmModelPath: string;
  }> {
    return {
      userProfile: await this.getUserProfile(),
      cameraSettings: await this.getCameraSettings(),
      expressionSettings: await this.getExpressionSettings(),
      windowSettings: await this.getWindowSettings(),
      mainWindowBounds: await this.getMainWindowBounds(),
      chatWindowBounds: await this.getChatWindowBounds(),
      chatWindowVisible: await this.getChatWindowVisible(),
      vrmModelPath: await this.getVrmModelPath()
    };
  }

  async saveAllSettings(settings: {
    userProfile?: UserProfile;
    cameraSettings?: CameraSettings;
    expressionSettings?: ExpressionSettings;
    windowSettings?: WindowSettings;
    mainWindowBounds?: WindowBounds;
    chatWindowBounds?: WindowBounds;
    chatWindowVisible?: boolean;
    vrmModelPath?: string;
  }): Promise<void> {
    if (settings.userProfile) {
      await this.saveUserProfile(settings.userProfile);
    }
    if (settings.cameraSettings) {
      await this.saveCameraSettings(settings.cameraSettings);
    }
    if (settings.expressionSettings) {
      await this.saveExpressionSettings(settings.expressionSettings);
    }
    if (settings.windowSettings) {
      await this.saveWindowSettings(settings.windowSettings);
    }
    if (settings.mainWindowBounds) {
      await this.saveMainWindowBounds(settings.mainWindowBounds);
    }
    if (settings.chatWindowBounds) {
      await this.saveChatWindowBounds(settings.chatWindowBounds);
    }
    if (settings.chatWindowVisible !== undefined) {
      await this.saveChatWindowVisible(settings.chatWindowVisible);
    }
    if (settings.vrmModelPath) {
      await this.saveVrmModelPath(settings.vrmModelPath);
    }
  }

  async resetToDefaults(): Promise<void> {
    this.settingsStore.resetToDefaults();
  }

  async resetDisplaySettings(): Promise<void> {
    this.settingsStore.resetDisplaySettings();
  }

  async getConfigPath(): Promise<string> {
    return this.settingsStore.getConfigPath();
  }

  async hasSettings(): Promise<boolean> {
    // 簡単な実装: 設定ファイルの存在チェック
    try {
      const configPath = await this.getConfigPath();
      return !!configPath;
    } catch {
      return false;
    }
  }

  // IAppStateRepositoryの実装

  async getLastWindowStates(): Promise<{
    mainWindow?: { bounds: WindowBounds; visible: boolean };
    chatWindow?: { bounds: WindowBounds; visible: boolean };
    settingsWindow?: { bounds: WindowBounds; visible: boolean };
  }> {
    const mainBounds = await this.getMainWindowBounds();
    const chatBounds = await this.getChatWindowBounds();
    const chatVisible = await this.getChatWindowVisible();

    const result: any = {};
    
    if (mainBounds) {
      result.mainWindow = { bounds: mainBounds, visible: true };
    }
    
    if (chatBounds) {
      result.chatWindow = { bounds: chatBounds, visible: chatVisible };
    }

    return result;
  }

  async saveLastWindowStates(states: {
    mainWindow?: { bounds: WindowBounds; visible: boolean };
    chatWindow?: { bounds: WindowBounds; visible: boolean };
    settingsWindow?: { bounds: WindowBounds; visible: boolean };
  }): Promise<void> {
    if (states.mainWindow) {
      await this.saveMainWindowBounds(states.mainWindow.bounds);
    }
    
    if (states.chatWindow) {
      await this.saveChatWindowBounds(states.chatWindow.bounds);
      await this.saveChatWindowVisible(states.chatWindow.visible);
    }
  }

  async getAppPreferences(): Promise<{
    autoStart?: boolean;
    minimizeToTray?: boolean;
    notifications?: boolean;
    updateChannel?: 'stable' | 'beta' | 'dev';
  }> {
    // 既存のSettingsStoreにはこれらの設定がないため、デフォルト値を返す
    return {
      autoStart: false,
      minimizeToTray: false,
      notifications: true,
      updateChannel: 'stable'
    };
  }

  async saveAppPreferences(preferences: {
    autoStart?: boolean;
    minimizeToTray?: boolean;
    notifications?: boolean;
    updateChannel?: 'stable' | 'beta' | 'dev';
  }): Promise<void> {
    // 既存のSettingsStoreにはこれらの設定がないため、コンソールにログ出力のみ
    console.log('アプリ設定の保存:', preferences);
    // 実際の実装ではレジストリや設定ファイルに保存
  }
}