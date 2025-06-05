/**
 * Screen Adapter - FSD Phase 2
 * Electron APIとの統合層
 */

import { 
  MousePosition, 
  UnsupportedPlatformError, 
  AccessibilityPermissionError 
} from '../types';

interface ScreenBounds {
  width: number;
  height: number;
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
    getCursorScreenPoint(): { x: number; y: number };
  };
  systemPreferences: {
    isTrustedAccessibilityClient(prompt: boolean): boolean;
  };
  dialog: {
    showMessageBox(options: DialogOptions): Promise<{ response: number }>;
    showErrorBox(title: string, content: string): void;
  };
}

export class ScreenAdapter {
  private static readonly PERMISSION_CHECK_INTERVAL = 1000;
  private static readonly PERMISSION_TIMEOUT_CHECKS = 30;

  private static readonly ERROR_MESSAGES = {
    LINUX_NOT_SUPPORTED: 'Linux is not supported for mouse follow feature',
    UNSUPPORTED_PLATFORM: 'Unsupported platform for mouse follow feature',
    ACCESSIBILITY_PERMISSION_REQUIRED: 'マウス追従機能にはアクセシビリティ権限が必要です',
    MOUSE_POSITION_FAILED: 'Failed to get mouse position'
  } as const;

  private static readonly PERMISSION_DIALOG = {
    TITLE: 'アクセシビリティ権限の要求',
    MESSAGE: 'デスクトップマスコットがマウス位置を追跡するため、アクセシビリティ権限が必要です。',
    DETAIL: [
      '「システム環境設定」→「プライバシーとセキュリティ」→「アクセシビリティ」',
      'で本アプリケーションを許可してください。'
    ].join('\n'),
    BUTTONS: ['システム環境設定を開く', '後で設定する']
  } as const;

  private static readonly UNSUPPORTED_OS_DIALOG = {
    TITLE: 'サポート対象外のOS',
    MESSAGE: 'マウス追従機能はLinux環境をサポートしていません。\nサポート対象: Windows 10+, macOS 10.15+'
  } as const;

  private readonly platform: 'win32' | 'darwin';
  private readonly electronAPIs: ElectronAPIs;

  constructor(electronAPIs?: ElectronAPIs) {
    this.electronAPIs = electronAPIs || this.getElectronAPIs();
    this.validatePlatform();
    this.platform = ((window as any).electronAPI?.platform || 'unknown') as 'win32' | 'darwin';
  }

  private getElectronAPIs(): ElectronAPIs {
    // ブラウザ環境ではwindow.electronAPIを使用
    return (window as any).electronAPI || require('electron');
  }

  private validatePlatform(): void {
    const platform = (window as any).electronAPI?.platform || 'unknown';
    
    if (platform === 'linux') {
      this.electronAPIs.dialog.showErrorBox(
        ScreenAdapter.UNSUPPORTED_OS_DIALOG.TITLE,
        ScreenAdapter.UNSUPPORTED_OS_DIALOG.MESSAGE
      );
      throw new UnsupportedPlatformError(ScreenAdapter.ERROR_MESSAGES.LINUX_NOT_SUPPORTED);
    }
    
    if (platform !== 'win32' && platform !== 'darwin') {
      throw new UnsupportedPlatformError(ScreenAdapter.ERROR_MESSAGES.UNSUPPORTED_PLATFORM);
    }
  }

  async initialize(): Promise<void> {
    if (this.platform === 'darwin') {
      const hasPermission = await this.checkPermission();
      if (!hasPermission) {
        const granted = await this.requestPermission();
        if (!granted) {
          throw new AccessibilityPermissionError(
            ScreenAdapter.ERROR_MESSAGES.ACCESSIBILITY_PERMISSION_REQUIRED
          );
        }
      }
    }
  }

  async checkPermission(): Promise<boolean> {
    if (this.platform !== 'darwin') return true;
    
    return this.electronAPIs.systemPreferences.isTrustedAccessibilityClient(false);
  }

  async requestPermission(): Promise<boolean> {
    if (this.platform !== 'darwin') return true;

    const { response } = await this.electronAPIs.dialog.showMessageBox({
      type: 'info',
      title: ScreenAdapter.PERMISSION_DIALOG.TITLE,
      message: ScreenAdapter.PERMISSION_DIALOG.MESSAGE,
      detail: ScreenAdapter.PERMISSION_DIALOG.DETAIL,
      buttons: ScreenAdapter.PERMISSION_DIALOG.BUTTONS,
      defaultId: 0
    });

    if (response === 0) {
      // システム環境設定を開く
      this.electronAPIs.systemPreferences.isTrustedAccessibilityClient(true);
      
      // 権限が付与されるまで待機
      return new Promise(resolve => {
        let checkCount = 0;
        
        const checkInterval = setInterval(() => {
          checkCount++;
          if (this.electronAPIs.systemPreferences.isTrustedAccessibilityClient(false)) {
            clearInterval(checkInterval);
            resolve(true);
          } else if (checkCount >= ScreenAdapter.PERMISSION_TIMEOUT_CHECKS) {
            clearInterval(checkInterval);
            resolve(false);
          }
        }, ScreenAdapter.PERMISSION_CHECK_INTERVAL);
      });
    }
    
    return false;
  }

  getMousePosition(): MousePosition {
    try {
      const point = this.electronAPIs.screen.getCursorScreenPoint();
      return {
        x: point.x,
        y: point.y,
        timestamp: Date.now()
      };
    } catch (error) {
      throw new Error(ScreenAdapter.ERROR_MESSAGES.MOUSE_POSITION_FAILED);
    }
  }

  getScreenBounds(): ScreenBounds {
    // window.screenのサイズを使用
    return {
      width: window.screen.width,
      height: window.screen.height,
      x: 0,
      y: 0
    };
  }
}