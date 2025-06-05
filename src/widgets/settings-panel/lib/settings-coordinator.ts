/**
 * SettingsCoordinator - Settings Panel Widget
 * FSD Phase 3: 設定統合調整機能（TDD: GREEN Phase）
 */

import { useSettings } from '@features/settings';
import { useVrmControl } from '@features/vrm-control';
import { useChat } from '@features/chat';
import { useMouseFollow } from '@features/mouse-follow';

interface DisplaySettings {
  theme?: 'light' | 'dark';
  opacity?: number;
  alwaysOnTop?: boolean;
}

interface ChatSettings {
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}

interface ExpressionSettings {
  enableEmotions?: boolean;
  intensityMultiplier?: number;
  transitionSpeed?: number;
}

interface CameraSettings {
  position?: { x: number; y: number; z: number };
  target?: { x: number; y: number; z: number };
  fov?: number;
}

interface DebugSettings {
  enableLogging?: boolean;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  showFPS?: boolean;
}

interface AllSettings {
  display?: DisplaySettings;
  chat?: ChatSettings;
  expression?: ExpressionSettings;
  camera?: CameraSettings;
  debug?: DebugSettings;
}

interface SettingsExportData {
  version: string;
  settings: AllSettings;
  timestamp: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface ChangeNotification {
  type: 'settings' | 'vrm' | 'chat' | 'mouse-follow';
  data: any;
}

type ChangeCallback = (notification: ChangeNotification) => void;

export class SettingsCoordinator {
  private settingsStore: ReturnType<typeof useSettings>['store'];
  private vrmStore: ReturnType<typeof useVrmControl>['store'];
  private chatStore: ReturnType<typeof useChat>['store'];
  private mouseFollowStore: ReturnType<typeof useMouseFollow>['store'];
  
  private subscribers: Set<ChangeCallback> = new Set();
  private unsubscribeFunctions: (() => void)[] = [];
  private isDestroyed: boolean = false;
  private lastNotificationData: Map<string, any> = new Map();

  constructor() {
    // Feature stores を初期化
    this.settingsStore = useSettings().store;
    this.vrmStore = useVrmControl().store;
    this.chatStore = useChat().store;
    this.mouseFollowStore = useMouseFollow().store;

    // 各store の変更を監視
    this.setupStoreSubscriptions();
  }

  /**
   * Display設定を取得
   */
  getDisplaySettings(): DisplaySettings {
    const state = this.settingsStore.getState();
    return state.display || {};
  }

  /**
   * Chat設定を取得
   */
  getChatSettings(): ChatSettings {
    const state = this.settingsStore.getState();
    return state.chat || {};
  }

  /**
   * Expression設定を取得
   */
  getExpressionSettings(): ExpressionSettings {
    const state = this.settingsStore.getState();
    return state.expression || {};
  }

  /**
   * Camera設定を取得
   */
  getCameraSettings(): CameraSettings {
    const state = this.settingsStore.getState();
    return state.camera || {};
  }

  /**
   * Debug設定を取得
   */
  getDebugSettings(): DebugSettings {
    const state = this.settingsStore.getState();
    return state.debug || {};
  }

  /**
   * 全設定を取得
   */
  getAllSettings(): AllSettings {
    return this.settingsStore.getState();
  }

  /**
   * Display設定を更新
   */
  async updateDisplaySettings(settings: Partial<DisplaySettings>): Promise<void> {
    if (this.isDestroyed) return;
    return this.settingsStore.updateDisplaySettings(settings);
  }

  /**
   * Chat設定を更新
   */
  async updateChatSettings(settings: Partial<ChatSettings>): Promise<void> {
    if (this.isDestroyed) return;
    return this.settingsStore.updateChatSettings(settings);
  }

  /**
   * Expression設定を更新
   */
  async updateExpressionSettings(settings: Partial<ExpressionSettings>): Promise<void> {
    if (this.isDestroyed) return;
    return this.settingsStore.updateExpressionSettings(settings);
  }

  /**
   * Camera設定を更新
   */
  async updateCameraSettings(settings: Partial<CameraSettings>): Promise<void> {
    if (this.isDestroyed) return;
    return this.settingsStore.updateCameraSettings(settings);
  }

  /**
   * Debug設定を更新
   */
  async updateDebugSettings(settings: Partial<DebugSettings>): Promise<void> {
    if (this.isDestroyed) return;
    return this.settingsStore.updateDebugSettings(settings);
  }

  /**
   * 設定変更を購読
   */
  subscribeToChanges(callback: ChangeCallback): () => void {
    if (this.isDestroyed) return () => {};

    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  /**
   * 設定をエクスポート
   */
  async exportSettings(): Promise<SettingsExportData> {
    return this.settingsStore.exportSettings();
  }

  /**
   * 設定をインポート
   */
  async importSettings(data: SettingsExportData): Promise<void> {
    return this.settingsStore.importSettings(data);
  }

  /**
   * 設定をデフォルトにリセット
   */
  async resetToDefaults(): Promise<void> {
    return this.settingsStore.resetToDefaults();
  }

  /**
   * 設定の妥当性を検証
   */
  validateSettings(settings: AllSettings): ValidationResult {
    const errors: string[] = [];

    // Display設定の検証
    if (settings.display) {
      const { theme, opacity, alwaysOnTop } = settings.display;
      
      if (theme && !['light', 'dark'].includes(theme)) {
        errors.push('Display theme must be "light" or "dark"');
      }
      
      if (opacity !== undefined) {
        if (typeof opacity !== 'number') {
          errors.push('Display opacity must be a number');
        } else if (opacity < 0 || opacity > 1) {
          errors.push('Display opacity must be between 0 and 1');
        }
      }
      
      if (alwaysOnTop !== undefined && typeof alwaysOnTop !== 'boolean') {
        errors.push('Display alwaysOnTop must be a boolean');
      }
    }

    // Chat設定の検証
    if (settings.chat) {
      const { apiKey, maxTokens, temperature } = settings.chat;
      
      if (apiKey !== undefined && typeof apiKey !== 'string') {
        errors.push('Chat apiKey must be a string');
      }
      
      if (maxTokens !== undefined) {
        if (typeof maxTokens !== 'number') {
          errors.push('Chat maxTokens must be a number');
        } else if (maxTokens <= 0) {
          errors.push('Chat maxTokens must be positive');
        }
      }
      
      if (temperature !== undefined) {
        if (typeof temperature !== 'number') {
          errors.push('Chat temperature must be a number');
        } else if (temperature < 0 || temperature > 2) {
          errors.push('Chat temperature must be between 0 and 2');
        }
      }
    }

    // Expression設定の検証
    if (settings.expression) {
      const { enableEmotions, intensityMultiplier, transitionSpeed } = settings.expression;
      
      if (enableEmotions !== undefined && typeof enableEmotions !== 'boolean') {
        errors.push('Expression enableEmotions must be a boolean');
      }
      
      if (intensityMultiplier !== undefined) {
        if (typeof intensityMultiplier !== 'number') {
          errors.push('Expression intensityMultiplier must be a number');
        } else if (intensityMultiplier < 0) {
          errors.push('Expression intensityMultiplier must be non-negative');
        }
      }
      
      if (transitionSpeed !== undefined) {
        if (typeof transitionSpeed !== 'number') {
          errors.push('Expression transitionSpeed must be a number');
        } else if (transitionSpeed < 0) {
          errors.push('Expression transitionSpeed must be non-negative');
        }
      }
    }

    // Camera設定の検証
    if (settings.camera) {
      const { position, target, fov } = settings.camera;
      
      if (position && (!this.isValidVector3(position))) {
        errors.push('Camera position must be a valid 3D vector');
      }
      
      if (target && (!this.isValidVector3(target))) {
        errors.push('Camera target must be a valid 3D vector');
      }
      
      if (fov !== undefined) {
        if (typeof fov !== 'number') {
          errors.push('Camera fov must be a number');
        } else if (fov <= 0 || fov >= 180) {
          errors.push('Camera fov must be between 0 and 180 degrees');
        }
      }
    }

    // Debug設定の検証
    if (settings.debug) {
      const { enableLogging, logLevel, showFPS } = settings.debug;
      
      if (enableLogging !== undefined && typeof enableLogging !== 'boolean') {
        errors.push('Debug enableLogging must be a boolean');
      }
      
      if (logLevel && !['debug', 'info', 'warn', 'error'].includes(logLevel)) {
        errors.push('Debug logLevel must be one of: debug, info, warn, error');
      }
      
      if (showFPS !== undefined && typeof showFPS !== 'boolean') {
        errors.push('Debug showFPS must be a boolean');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * リソースをクリーンアップ
   */
  destroy(): void {
    if (this.isDestroyed) return;

    // 全ての購読を解除
    this.unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFunctions = [];
    this.subscribers.clear();
    this.lastNotificationData.clear();
    
    this.isDestroyed = true;
  }

  /**
   * Store購読を設定
   */
  private setupStoreSubscriptions(): void {
    // Settings store の変更を監視
    const unsubscribeSettings = this.settingsStore.subscribe((state) => {
      this.notifySubscribers('settings', state);
    });
    this.unsubscribeFunctions.push(unsubscribeSettings);

    // VRM store の変更を監視
    const unsubscribeVrm = this.vrmStore.subscribe((state) => {
      this.notifySubscribers('vrm', state);
    });
    this.unsubscribeFunctions.push(unsubscribeVrm);

    // Chat store の変更を監視
    const unsubscribeChat = this.chatStore.subscribe((state) => {
      this.notifySubscribers('chat', state);
    });
    this.unsubscribeFunctions.push(unsubscribeChat);

    // MouseFollow store の変更を監視
    const unsubscribeMouseFollow = this.mouseFollowStore.subscribe((state) => {
      this.notifySubscribers('mouse-follow', state);
    });
    this.unsubscribeFunctions.push(unsubscribeMouseFollow);
  }

  /**
   * 購読者に変更を通知（重複通知を防ぐ）
   */
  private notifySubscribers(type: ChangeNotification['type'], data: any): void {
    if (this.isDestroyed) return;

    // 重複通知を防ぐために前回のデータと比較
    const lastData = this.lastNotificationData.get(type);
    if (lastData && JSON.stringify(lastData) === JSON.stringify(data)) {
      return;
    }

    this.lastNotificationData.set(type, data);

    const notification: ChangeNotification = { type, data };
    this.subscribers.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in SettingsCoordinator subscriber:', error);
      }
    });
  }

  /**
   * 3Dベクターの妥当性をチェック
   */
  private isValidVector3(vector: any): boolean {
    return (
      typeof vector === 'object' &&
      vector !== null &&
      typeof vector.x === 'number' &&
      typeof vector.y === 'number' &&
      typeof vector.z === 'number' &&
      !isNaN(vector.x) &&
      !isNaN(vector.y) &&
      !isNaN(vector.z)
    );
  }
}