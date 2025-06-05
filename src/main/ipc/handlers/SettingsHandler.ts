/**
 * 設定関連のIPCハンドラーを管理するクラス
 */

import { ipcMain, IpcMainInvokeEvent, dialog } from 'electron';

import { 
  createSuccessResponse, 
  createErrorResponse,
  IPCResponse,
  GetSettingsResponse,
  SaveSettingsResponse,
  SelectVrmFileResponse,
  GetCameraSettingsResponse,
  ResetCameraSettingsResponse,
  GetWindowBoundsResponse,
  GetChatVisibleResponse,
  ResetAllDisplaySettingsResponse
} from '../types';
import { MessageValidator } from '../validators/MessageValidator';
import { SettingsStore, SettingsData, CameraSettings, WindowBounds } from '../../../utils/settingsStore';
import { WindowManagerController } from '../../windows/WindowManagerController';
import { IPC_CHANNELS } from '../../../config/ipcChannels';

export class SettingsHandler {
  constructor(
    private settingsStore: SettingsStore,
    private windowManagerController: WindowManagerController
  ) {}

  /**
   * すべての設定関連IPCハンドラーを登録
   */
  public setupHandlers(): void {
    console.log('[SettingsHandler] 設定関連IPCハンドラーを登録中...');
    
    // 基本設定
    ipcMain.handle('get-settings', this.handleGetSettings.bind(this));
    ipcMain.handle('save-settings', this.handleSaveSettings.bind(this));
    ipcMain.handle('reset-settings', this.handleResetSettings.bind(this));
    ipcMain.handle('select-vrm-file', this.handleSelectVrmFile.bind(this));

    // カメラ設定
    ipcMain.handle(IPC_CHANNELS.CAMERA.GET_SETTINGS, this.handleGetCameraSettings.bind(this));
    ipcMain.handle(IPC_CHANNELS.CAMERA.SET_SETTINGS, this.handleSetCameraSettings.bind(this));
    ipcMain.handle(IPC_CHANNELS.CAMERA.RESET_SETTINGS, this.handleResetCameraSettings.bind(this));

    // ウィンドウ位置
    ipcMain.handle(IPC_CHANNELS.WINDOW.GET_MAIN_BOUNDS, this.handleGetMainWindowBounds.bind(this));
    ipcMain.handle(IPC_CHANNELS.WINDOW.SET_MAIN_BOUNDS, this.handleSetMainWindowBounds.bind(this));
    ipcMain.handle(IPC_CHANNELS.WINDOW.GET_CHAT_BOUNDS, this.handleGetChatWindowBounds.bind(this));
    ipcMain.handle(IPC_CHANNELS.WINDOW.SET_CHAT_BOUNDS, this.handleSetChatWindowBounds.bind(this));
    ipcMain.handle(IPC_CHANNELS.WINDOW.GET_CHAT_VISIBLE, this.handleGetChatWindowVisible.bind(this));
    ipcMain.handle(IPC_CHANNELS.WINDOW.SET_CHAT_VISIBLE, this.handleSetChatWindowVisible.bind(this));

    // 画面表示設定
    ipcMain.handle(IPC_CHANNELS.DISPLAY.SAVE_ALL_SETTINGS, this.handleSaveAllDisplaySettings.bind(this));
    ipcMain.handle(IPC_CHANNELS.DISPLAY.RESET_ALL_SETTINGS, this.handleResetAllDisplaySettings.bind(this));

    // リップシンク設定
    ipcMain.handle('get-lip-sync-enabled', this.handleGetLipSyncEnabled.bind(this));

    console.log('[SettingsHandler] すべての設定関連IPCハンドラーが登録されました');
  }

  /**
   * ログ出力ヘルパー
   */
  private log(level: 'info' | 'warn' | 'error', method: string, message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[SettingsHandler:${method}] ${message}`;
    
    switch (level) {
      case 'info':
        console.log(`${timestamp} ${logMessage}`, data ? data : '');
        break;
      case 'warn':
        console.warn(`${timestamp} ${logMessage}`, data ? data : '');
        break;
      case 'error':
        console.error(`${timestamp} ${logMessage}`, data ? data : '');
        break;
    }
  }

  /**
   * 設定の取得
   */
  private async handleGetSettings(_event: IpcMainInvokeEvent): Promise<IPCResponse<GetSettingsResponse>> {
    this.log('info', 'handleGetSettings', '設定取得リクエストを受信');
    
    try {
      const settings = this.settingsStore.getAllSettings();
      this.log('info', 'handleGetSettings', '設定を正常に取得');
      
      return createSuccessResponse<GetSettingsResponse>({ settings });
    } catch (error) {
      const errorMessage = `設定の取得中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleGetSettings', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * 設定の保存
   */
  private async handleSaveSettings(
    _event: IpcMainInvokeEvent, 
    settings: SettingsData
  ): Promise<IPCResponse<SaveSettingsResponse>> {
    this.log('info', 'handleSaveSettings', '設定保存リクエストを受信', { settingsKeys: Object.keys(settings) });
    
    try {
      // リクエストのバリデーション
      const validation = MessageValidator.validateSaveSettingsRequest({ settings });
      if (!validation.isValid) {
        this.log('warn', 'handleSaveSettings', 'バリデーションエラー', validation.errors);
        return createErrorResponse(`設定のバリデーションに失敗: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // 設定の保存
      this.settingsStore.saveAllSettings(settings);
      this.log('info', 'handleSaveSettings', '設定を正常に保存');

      // メインウィンドウのサイズ更新
      if (settings.windowSize) {
        try {
          const mainWindow = this.windowManagerController.getMainWindow();
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setSize(settings.windowSize.width, settings.windowSize.height);
            this.log('info', 'handleSaveSettings', 'メインウィンドウサイズを更新', settings.windowSize);
          }
        } catch (windowError) {
          this.log('warn', 'handleSaveSettings', 'ウィンドウサイズ更新でエラー', windowError);
          // ウィンドウ更新のエラーは設定保存の失敗ではない
        }
      }

      // VRMモデルの更新通知
      if (settings.vrmModelPath) {
        this.log('info', 'handleSaveSettings', 'VRMモデルパスが更新', settings.vrmModelPath);
        // TODO: VRMモデルの読み込み処理を実装
      }

      const updatedSettings = this.settingsStore.getAllSettings();
      return createSuccessResponse<SaveSettingsResponse>({ 
        settings: updatedSettings,
        validationErrors: validation.warnings?.map(w => w.message) || []
      });

    } catch (error) {
      const errorMessage = `設定の保存中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSaveSettings', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * 設定のリセット
   */
  private async handleResetSettings(_event: IpcMainInvokeEvent): Promise<IPCResponse<GetSettingsResponse>> {
    this.log('info', 'handleResetSettings', '設定リセットリクエストを受信');
    
    try {
      this.settingsStore.resetToDefaults();
      const settings = this.settingsStore.getAllSettings();
      this.log('info', 'handleResetSettings', '設定を正常にリセット');
      
      return createSuccessResponse<GetSettingsResponse>({ settings });
    } catch (error) {
      const errorMessage = `設定のリセット中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleResetSettings', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * VRMファイル選択ダイアログ
   */
  private async handleSelectVrmFile(_event: IpcMainInvokeEvent): Promise<IPCResponse<SelectVrmFileResponse>> {
    this.log('info', 'handleSelectVrmFile', 'VRMファイル選択ダイアログを開始');
    
    try {
      const result = await dialog.showOpenDialog({
        title: 'VRMファイルを選択',
        filters: [
          { name: 'VRM Files', extensions: ['vrm'] },
          { name: 'All Files', extensions: ['*'] }
        ],
        properties: ['openFile']
      });
      
      const filePath = (!result.canceled && result.filePaths.length > 0) ? result.filePaths[0] : null;
      
      this.log('info', 'handleSelectVrmFile', 'ファイル選択完了', { 
        canceled: result.canceled, 
        filePath 
      });
      
      return createSuccessResponse<SelectVrmFileResponse>({ filePath });
    } catch (error) {
      const errorMessage = `VRMファイル選択中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSelectVrmFile', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * カメラ設定の取得
   */
  private async handleGetCameraSettings(_event: IpcMainInvokeEvent): Promise<IPCResponse<GetCameraSettingsResponse>> {
    this.log('info', 'handleGetCameraSettings', 'カメラ設定取得リクエストを受信');
    
    try {
      const settings = this.settingsStore.getCameraSettings();
      this.log('info', 'handleGetCameraSettings', 'カメラ設定を正常に取得');
      
      return createSuccessResponse<GetCameraSettingsResponse>({ settings });
    } catch (error) {
      const errorMessage = `カメラ設定の取得中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleGetCameraSettings', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * カメラ設定の保存
   */
  private async handleSetCameraSettings(
    _event: IpcMainInvokeEvent, 
    settings: CameraSettings
  ): Promise<IPCResponse> {
    this.log('info', 'handleSetCameraSettings', 'カメラ設定保存リクエストを受信', settings);
    
    try {
      // リクエストのバリデーション
      const validation = MessageValidator.validateSetCameraSettingsRequest({ settings });
      if (!validation.isValid) {
        this.log('warn', 'handleSetCameraSettings', 'バリデーションエラー', validation.errors);
        return createErrorResponse(`カメラ設定のバリデーションに失敗: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      this.settingsStore.setCameraSettings(settings);
      this.log('info', 'handleSetCameraSettings', 'カメラ設定を正常に保存');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `カメラ設定の保存中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSetCameraSettings', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * カメラ設定のリセット
   */
  private async handleResetCameraSettings(_event: IpcMainInvokeEvent): Promise<IPCResponse<ResetCameraSettingsResponse>> {
    this.log('info', 'handleResetCameraSettings', 'カメラ設定リセットリクエストを受信');
    
    try {
      this.settingsStore.resetDisplaySettings();
      const settings = this.settingsStore.getCameraSettings();
      this.log('info', 'handleResetCameraSettings', 'カメラ設定を正常にリセット');
      
      return createSuccessResponse<ResetCameraSettingsResponse>({ settings });
    } catch (error) {
      const errorMessage = `カメラ設定のリセット中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleResetCameraSettings', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * メインウィンドウ位置の取得
   */
  private async handleGetMainWindowBounds(_event: IpcMainInvokeEvent): Promise<IPCResponse<GetWindowBoundsResponse>> {
    this.log('info', 'handleGetMainWindowBounds', 'メインウィンドウ位置取得リクエストを受信');
    
    try {
      const bounds = this.settingsStore.getMainWindowBounds();
      this.log('info', 'handleGetMainWindowBounds', 'メインウィンドウ位置を正常に取得');
      
      return createSuccessResponse<GetWindowBoundsResponse>({ bounds });
    } catch (error) {
      const errorMessage = `メインウィンドウ位置の取得中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleGetMainWindowBounds', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * メインウィンドウ位置の設定
   */
  private async handleSetMainWindowBounds(
    _event: IpcMainInvokeEvent, 
    bounds: WindowBounds
  ): Promise<IPCResponse> {
    this.log('info', 'handleSetMainWindowBounds', 'メインウィンドウ位置設定リクエストを受信', bounds);
    
    try {
      // リクエストのバリデーション
      const validation = MessageValidator.validateSetWindowBoundsRequest({ 
        windowType: 'main', 
        bounds 
      });
      if (!validation.isValid) {
        this.log('warn', 'handleSetMainWindowBounds', 'バリデーションエラー', validation.errors);
        return createErrorResponse(`ウィンドウ位置のバリデーションに失敗: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      this.settingsStore.setMainWindowBounds(bounds);
      this.log('info', 'handleSetMainWindowBounds', 'メインウィンドウ位置を正常に保存');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `メインウィンドウ位置の保存中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSetMainWindowBounds', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * チャットウィンドウ位置の取得
   */
  private async handleGetChatWindowBounds(_event: IpcMainInvokeEvent): Promise<IPCResponse<GetWindowBoundsResponse>> {
    this.log('info', 'handleGetChatWindowBounds', 'チャットウィンドウ位置取得リクエストを受信');
    
    try {
      const bounds = this.settingsStore.getChatWindowBounds();
      this.log('info', 'handleGetChatWindowBounds', 'チャットウィンドウ位置を正常に取得');
      
      return createSuccessResponse<GetWindowBoundsResponse>({ bounds });
    } catch (error) {
      const errorMessage = `チャットウィンドウ位置の取得中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleGetChatWindowBounds', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * チャットウィンドウ位置の設定
   */
  private async handleSetChatWindowBounds(
    _event: IpcMainInvokeEvent, 
    bounds: WindowBounds
  ): Promise<IPCResponse> {
    this.log('info', 'handleSetChatWindowBounds', 'チャットウィンドウ位置設定リクエストを受信', bounds);
    
    try {
      // リクエストのバリデーション
      const validation = MessageValidator.validateSetWindowBoundsRequest({ 
        windowType: 'chat', 
        bounds 
      });
      if (!validation.isValid) {
        this.log('warn', 'handleSetChatWindowBounds', 'バリデーションエラー', validation.errors);
        return createErrorResponse(`ウィンドウ位置のバリデーションに失敗: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      this.settingsStore.setChatWindowBounds(bounds);
      this.log('info', 'handleSetChatWindowBounds', 'チャットウィンドウ位置を正常に保存');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `チャットウィンドウ位置の保存中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSetChatWindowBounds', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * チャットウィンドウ表示状態の取得
   */
  private async handleGetChatWindowVisible(_event: IpcMainInvokeEvent): Promise<IPCResponse<GetChatVisibleResponse>> {
    this.log('info', 'handleGetChatWindowVisible', 'チャットウィンドウ表示状態取得リクエストを受信');
    
    try {
      const visible = this.settingsStore.getChatWindowVisible();
      this.log('info', 'handleGetChatWindowVisible', 'チャットウィンドウ表示状態を正常に取得', { visible });
      
      return createSuccessResponse<GetChatVisibleResponse>({ visible });
    } catch (error) {
      const errorMessage = `チャットウィンドウ表示状態の取得中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleGetChatWindowVisible', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * チャットウィンドウ表示状態の設定
   */
  private async handleSetChatWindowVisible(
    _event: IpcMainInvokeEvent, 
    visible: boolean
  ): Promise<IPCResponse> {
    this.log('info', 'handleSetChatWindowVisible', 'チャットウィンドウ表示状態設定リクエストを受信', { visible });
    
    try {
      this.settingsStore.setChatWindowVisible(visible);
      this.log('info', 'handleSetChatWindowVisible', 'チャットウィンドウ表示状態を正常に保存');
      
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `チャットウィンドウ表示状態の保存中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSetChatWindowVisible', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * 画面表示設定の一括保存
   */
  private async handleSaveAllDisplaySettings(
    _event: IpcMainInvokeEvent, 
    settings: SettingsData
  ): Promise<IPCResponse> {
    this.log('info', 'handleSaveAllDisplaySettings', '画面表示設定一括保存リクエストを受信', { settingsKeys: Object.keys(settings) });
    
    try {
      // リクエストのバリデーション
      const validation = MessageValidator.validateSaveSettingsRequest({ settings });
      if (!validation.isValid) {
        this.log('warn', 'handleSaveAllDisplaySettings', 'バリデーションエラー', validation.errors);
        return createErrorResponse(`画面表示設定のバリデーションに失敗: ${validation.errors.map(e => e.message).join(', ')}`);
      }

      // 各設定の保存
      if (settings.cameraSettings) {
        this.settingsStore.setCameraSettings(settings.cameraSettings);
      }
      if (settings.mainWindowBounds) {
        this.settingsStore.setMainWindowBounds(settings.mainWindowBounds);
      }
      if (settings.chatWindowBounds) {
        this.settingsStore.setChatWindowBounds(settings.chatWindowBounds);
      }
      if (typeof settings.chatWindowVisible === 'boolean') {
        this.settingsStore.setChatWindowVisible(settings.chatWindowVisible);
      }

      this.log('info', 'handleSaveAllDisplaySettings', '画面表示設定を正常に一括保存');
      return createSuccessResponse();
    } catch (error) {
      const errorMessage = `画面表示設定の一括保存中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleSaveAllDisplaySettings', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * 画面表示設定の一括リセット
   */
  private async handleResetAllDisplaySettings(_event: IpcMainInvokeEvent): Promise<IPCResponse<ResetAllDisplaySettingsResponse>> {
    this.log('info', 'handleResetAllDisplaySettings', '画面表示設定一括リセットリクエストを受信');
    
    try {
      this.settingsStore.resetDisplaySettings();
      const settings = this.settingsStore.getAllSettings();
      this.log('info', 'handleResetAllDisplaySettings', '画面表示設定を正常に一括リセット');
      
      return createSuccessResponse<ResetAllDisplaySettingsResponse>({ settings });
    } catch (error) {
      const errorMessage = `画面表示設定の一括リセット中にエラーが発生: ${error instanceof Error ? error.message : '不明なエラー'}`;
      this.log('error', 'handleResetAllDisplaySettings', errorMessage, error);
      return createErrorResponse(errorMessage);
    }
  }

  /**
   * リップシンク有効状態の取得
   */
  private async handleGetLipSyncEnabled(_event: IpcMainInvokeEvent): Promise<boolean> {
    this.log('info', 'handleGetLipSyncEnabled', 'リップシンク有効状態取得リクエストを受信');
    
    try {
      const enabled = this.settingsStore.getLipSyncEnabled();
      this.log('info', 'handleGetLipSyncEnabled', 'リップシンク有効状態を正常に取得', { enabled });
      
      return enabled;
    } catch (error) {
      this.log('error', 'handleGetLipSyncEnabled', 'リップシンク有効状態の取得中にエラーが発生', error);
      // エラーの場合はデフォルトでtrueを返す
      return true;
    }
  }

  /**
   * ハンドラーのクリーンアップ
   */
  public cleanup(): void {
    this.log('info', 'cleanup', '設定関連IPCハンドラーをクリーンアップ中...');
    
    // 必要に応じて個別のクリーンアップ処理を実装
    // 現在はElectronが自動的にハンドラーを管理するため、特別な処理は不要
    
    this.log('info', 'cleanup', '設定関連IPCハンドラーのクリーンアップが完了');
  }
}