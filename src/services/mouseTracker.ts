import * as THREE from 'three';

interface Point {
  x: number;
  y: number;
}

interface DialogOptions {
  type: string;
  title: string;
  message: string;
  detail: string;
  buttons: string[];
  defaultId: number;
}

interface ElectronAPIs {
  screen: {
    getCursorScreenPoint(): Point;
  };
  systemPreferences: {
    isTrustedAccessibilityClient(prompt: boolean): boolean;
  };
  dialog: {
    showMessageBox(options: DialogOptions): Promise<{ response: number }>;
    showErrorBox(title: string, content: string): void;
  };
}

export class UnsupportedPlatformError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedPlatformError';
  }
}

export class AccessibilityPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessibilityPermissionError';
  }
}

export class MouseTracker {
  private static readonly DEFAULT_TRACKING_FREQUENCY = 15;
  private static readonly PERMISSION_CHECK_INTERVAL = 1000;
  private static readonly PERMISSION_TIMEOUT_CHECKS = 30;
  private static readonly COORDINATE_TRANSFORM_X_SCALE = 200;
  private static readonly COORDINATE_TRANSFORM_Y_SCALE = 800;
  private static readonly COORDINATE_TRANSFORM_Y_OFFSET = 0.5;

  private static readonly ERROR_MESSAGES = {
    LINUX_NOT_SUPPORTED: 'Linux is not supported for mouse follow feature',
    UNSUPPORTED_PLATFORM: 'Unsupported platform for mouse follow feature',
    ACCESSIBILITY_PERMISSION_REQUIRED: 'マウス追従機能にはアクセシビリティ権限が必要です'
  } as const;

  private static readonly PERMISSION_DIALOG = {
    TITLE: 'アクセシビリティ権限の要求',
    MESSAGE: 'デスクトップマスコットがマウス位置を追跡するため、アクセシビリティ権限が必要です。',
    DETAIL: ['「システム環境設定」→「プライバシーとセキュリティ」→「アクセシビリティ」', 'で本アプリケーションを許可してください。'].join('\n'),
    BUTTONS: ['システム環境設定を開く', '後で設定する']
  } as const;

  private static readonly UNSUPPORTED_OS_DIALOG = {
    TITLE: 'サポート対象外のOS',
    MESSAGE: 'マウス追従機能はLinux環境をサポートしていません。\nサポート対象: Windows 10+, macOS 10.15+'
  } as const;

  private readonly platform: 'win32' | 'darwin';
  private isTrackingActive = false;
  private trackingInterval: NodeJS.Timer | null = null;
  private trackingFrequency = MouseTracker.DEFAULT_TRACKING_FREQUENCY;
  private readonly positionCallbacks: Array<(position: THREE.Vector3) => void> = [];
  private readonly errorCallbacks: Array<(error: Error) => void> = [];
  private readonly electronAPIs: ElectronAPIs;

  constructor(electronAPIs?: ElectronAPIs) {
    this.electronAPIs = electronAPIs || this.getElectronAPIs();
    this.validatePlatform();
    this.platform = process.platform as 'win32' | 'darwin';
  }

  private getElectronAPIs(): ElectronAPIs {
    // Use window.electronAPI in browser environment
    return (window as any).electronAPI || require('electron');
  }

  private validatePlatform(): void {
    if (process.platform === 'linux') {
      this.electronAPIs.dialog.showErrorBox(
        MouseTracker.UNSUPPORTED_OS_DIALOG.TITLE,
        MouseTracker.UNSUPPORTED_OS_DIALOG.MESSAGE
      );
      throw new UnsupportedPlatformError(MouseTracker.ERROR_MESSAGES.LINUX_NOT_SUPPORTED);
    }
    
    if (process.platform !== 'win32' && process.platform !== 'darwin') {
      throw new UnsupportedPlatformError(MouseTracker.ERROR_MESSAGES.UNSUPPORTED_PLATFORM);
    }
  }

  async initialize(): Promise<void> {
    if (this.platform === 'darwin') {
      const hasPermission = await this.checkAccessibilityPermission();
      if (!hasPermission) {
        const granted = await this.requestAccessibilityPermission();
        if (!granted) {
          throw new AccessibilityPermissionError(MouseTracker.ERROR_MESSAGES.ACCESSIBILITY_PERMISSION_REQUIRED);
        }
      }
    }
  }

  async checkAccessibilityPermission(): Promise<boolean> {
    if (this.platform !== 'darwin') return true;
    
    return this.electronAPIs.systemPreferences.isTrustedAccessibilityClient(false);
  }

  async requestAccessibilityPermission(): Promise<boolean> {
    if (this.platform !== 'darwin') return true;

    const { response } = await this.electronAPIs.dialog.showMessageBox({
      type: 'info',
      title: MouseTracker.PERMISSION_DIALOG.TITLE,
      message: MouseTracker.PERMISSION_DIALOG.MESSAGE,
      detail: MouseTracker.PERMISSION_DIALOG.DETAIL,
      buttons: MouseTracker.PERMISSION_DIALOG.BUTTONS,
      defaultId: 0
    });

    if (response === 0) {
      this.electronAPIs.systemPreferences.isTrustedAccessibilityClient(true);
      
      return new Promise(resolve => {
        let checkCount = 0;
        
        const checkInterval = setInterval(() => {
          checkCount++;
          if (this.electronAPIs.systemPreferences.isTrustedAccessibilityClient(false)) {
            clearInterval(checkInterval);
            resolve(true);
          } else if (checkCount >= MouseTracker.PERMISSION_TIMEOUT_CHECKS) {
            clearInterval(checkInterval);
            resolve(false);
          }
        }, MouseTracker.PERMISSION_CHECK_INTERVAL);
      });
    }
    
    return false;
  }

  async startTracking(frequency: number = MouseTracker.DEFAULT_TRACKING_FREQUENCY): Promise<boolean> {
    if (this.isTrackingActive) {
      return false;
    }

    this.trackingFrequency = frequency;
    
    try {
      this.startTrackingTimer(frequency);
      this.isTrackingActive = true;
      return true;
    } catch (error) {
      this.isTrackingActive = false;
      this.notifyError(error as Error);
      throw error;
    }
  }

  private startTrackingTimer(frequency: number): void {
    const intervalMs = 1000 / frequency;
    this.trackingInterval = setInterval(() => {
      this.trackMouse();
    }, intervalMs);
  }

  private notifyError(error: Error): void {
    this.errorCallbacks.forEach(callback => callback(error));
  }

  async stopTracking(): Promise<void> {
    if (this.trackingInterval) {
      clearInterval(this.trackingInterval);
      this.trackingInterval = null;
    }
    this.isTrackingActive = false;
  }

  public trackMouse(): void {
    try {
      const screenPos = this.getScreenCursorPosition();
      const worldPos = this.convertScreenToWorld(screenPos);
      this.notifyPositionChange(worldPos);
    } catch (error) {
      this.notifyError(error as Error);
    }
  }

  private getScreenCursorPosition(): Point {
    return this.electronAPIs.screen.getCursorScreenPoint();
  }

  private notifyPositionChange(worldPosition: THREE.Vector3): void {
    this.positionCallbacks.forEach(callback => callback(worldPosition));
  }

  convertScreenToWorld(screenPos: Point): THREE.Vector3 {
    const normalizedX = screenPos.x / MouseTracker.COORDINATE_TRANSFORM_X_SCALE;
    const normalizedY = -(screenPos.y / MouseTracker.COORDINATE_TRANSFORM_Y_SCALE - MouseTracker.COORDINATE_TRANSFORM_Y_OFFSET);
    
    return new THREE.Vector3(normalizedX, normalizedY, 0);
  }

  isTracking(): boolean {
    return this.isTrackingActive;
  }

  getTrackingFrequency(): number {
    return this.trackingFrequency;
  }

  onPositionChange(callback: (position: THREE.Vector3) => void): () => void {
    this.positionCallbacks.push(callback);
    
    return () => {
      const index = this.positionCallbacks.indexOf(callback);
      if (index > -1) {
        this.positionCallbacks.splice(index, 1);
      }
    };
  }

  onError(callback: (error: Error) => void): () => void {
    this.errorCallbacks.push(callback);
    
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  getCallbackCount(): number {
    return this.positionCallbacks.length;
  }
}