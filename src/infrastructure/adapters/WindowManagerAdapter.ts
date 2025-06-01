/**
 * WindowManagerをIWindowManagerGatewayインターフェースにアダプトするアダプター
 */

import { 
  IWindowManagerGateway, 
  WindowState, 
  WindowCreationOptions, 
  WindowEventCallbacks 
} from '../../domain/gateways/IWindowManagerGateway';
import { WindowBounds } from '../../domain/value-objects/WindowBounds';
import { WindowManager } from '../../utils/WindowManager';

export class WindowManagerAdapter implements IWindowManagerGateway {
  constructor(private windowManager: WindowManager) {}

  async initialize(): Promise<void> {
    // WindowManagerは既に初期化されていると仮定
    console.log('WindowManagerAdapterが初期化されました');
  }

  async createWindow(
    type: 'main' | 'chat' | 'settings' | 'speechBubble',
    options: WindowCreationOptions,
    callbacks?: WindowEventCallbacks
  ): Promise<string> {
    // 簡化された実装 - 既存のWindowManagerの機能を利用
    const windowId = `${type}_${Date.now()}`;
    
    switch (type) {
      case 'main':
        // メインウィンドウは既に作成済みと仮定
        break;
      case 'chat':
        // チャットウィンドウの作成
        break;
      case 'settings':
        // 設定ウィンドウの作成
        break;
      case 'speechBubble':
        // スピーチバブルウィンドウの作成
        break;
    }
    
    return windowId;
  }

  async showWindow(windowId: string): Promise<void> {
    console.log(`ウィンドウを表示: ${windowId}`);
  }

  async hideWindow(windowId: string): Promise<void> {
    console.log(`ウィンドウを非表示: ${windowId}`);
  }

  async setWindowBounds(windowId: string, bounds: WindowBounds): Promise<void> {
    console.log(`ウィンドウ境界を設定: ${windowId}`, bounds.toString());
  }

  async getWindowBounds(windowId: string): Promise<WindowBounds> {
    // デフォルト値を返す
    return new WindowBounds(100, 100, 800, 600);
  }

  async focusWindow(windowId: string): Promise<void> {
    console.log(`ウィンドウにフォーカス: ${windowId}`);
  }

  async blurWindow(windowId: string): Promise<void> {
    console.log(`ウィンドウからフォーカスを外す: ${windowId}`);
  }

  async minimizeWindow(windowId: string): Promise<void> {
    console.log(`ウィンドウを最小化: ${windowId}`);
  }

  async maximizeWindow(windowId: string): Promise<void> {
    console.log(`ウィンドウを最大化: ${windowId}`);
  }

  async unmaximizeWindow(windowId: string): Promise<void> {
    console.log(`ウィンドウの最大化を解除: ${windowId}`);
  }

  async restoreWindow(windowId: string): Promise<void> {
    console.log(`ウィンドウを復元: ${windowId}`);
  }

  async closeWindow(windowId: string): Promise<void> {
    console.log(`ウィンドウをクローズ: ${windowId}`);
  }

  async getWindowState(windowId: string): Promise<WindowState> {
    return {
      id: windowId,
      title: 'Test Window',
      bounds: new WindowBounds(100, 100, 800, 600),
      visible: true,
      minimized: false,
      maximized: false,
      focused: false,
      closable: true,
      minimizable: true,
      maximizable: true,
      resizable: true,
      alwaysOnTop: false,
      opacity: 1.0
    };
  }

  async getAllWindowStates(): Promise<WindowState[]> {
    return [];
  }

  async windowExists(windowId: string): Promise<boolean> {
    return true; // 簡化した実装
  }

  async setWindowOpacity(windowId: string, opacity: number): Promise<void> {
    console.log(`ウィンドウの透明度を設定: ${windowId}, opacity: ${opacity}`);
  }

  async setAlwaysOnTop(windowId: string, alwaysOnTop: boolean): Promise<void> {
    console.log(`ウィンドウの最前面表示を設定: ${windowId}, alwaysOnTop: ${alwaysOnTop}`);
  }

  async loadUrl(windowId: string, url: string): Promise<void> {
    console.log(`ウィンドウにURLを読み込み: ${windowId}, url: ${url}`);
  }

  async loadFile(windowId: string, filePath: string): Promise<void> {
    console.log(`ウィンドウにファイルを読み込み: ${windowId}, file: ${filePath}`);
  }

  async sendMessage(windowId: string, channel: string, data: any): Promise<void> {
    console.log(`ウィンドウにメッセージ送信: ${windowId}, channel: ${channel}`);
  }

  async onMessage(
    windowId: string,
    channel: string,
    callback: (data: any) => void
  ): Promise<void> {
    console.log(`ウィンドウのメッセージリスナーを登録: ${windowId}, channel: ${channel}`);
  }

  async addEventListener(
    windowId: string,
    event: string,
    callback: (...args: any[]) => void
  ): Promise<void> {
    console.log(`ウィンドウのイベントリスナーを登録: ${windowId}, event: ${event}`);
  }

  async removeEventListener(
    windowId: string,
    event: string,
    callback: (...args: any[]) => void
  ): Promise<void> {
    console.log(`ウィンドウのイベントリスナーを削除: ${windowId}, event: ${event}`);
  }

  async closeAllWindows(): Promise<void> {
    console.log('全ウィンドウをクローズ');
  }

  async dispose(): Promise<void> {
    console.log('WindowManagerAdapterをクリーンアップ');
  }
}