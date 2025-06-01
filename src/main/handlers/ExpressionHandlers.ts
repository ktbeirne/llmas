import { ipcMain, IpcMainInvokeEvent } from 'electron';

import { reinitializeGemini } from '../../geminiService';
import { IPC_CHANNELS } from '../../config/ipcChannels';
import { SettingsStore } from '../../utils/settingsStore';
import { ExpressionSettings } from '../../types/tools';
import { SpeechBubbleManager } from '../../utils/speechBubbleManager';
import { WindowManagerController } from '../windows/WindowManagerController';
import { generateDynamicToolsJson } from '../services/DynamicToolsGenerator';

/**
 * 動的tools.jsonを生成する関数（外部から呼び出し可能）
 */
export async function generateDynamicToolsJsonExternal(
  windowManagerController: WindowManagerController,
  settingsStore: SettingsStore
): Promise<void> {
  return generateDynamicToolsJson(windowManagerController, settingsStore);
}

/**
 * 表情関連のIPCハンドラーを設定
 */
export function setupExpressionHandlers(
  windowManagerController: WindowManagerController,
  settingsStore: SettingsStore
): void {
  // 表情設定関連のIPCハンドラー
  ipcMain.handle('get-available-expressions', async () => {
    try {
      console.log('[Main] 利用可能表情の取得を開始');
      
      // メインウィンドウ（レンダラープロセス）から直接VRM情報を取得
      const mainWindow = windowManagerController.getMainWindow();
      if (!mainWindow) {
        console.warn('[Main] メインウィンドウが見つかりません');
        return [];
      }
      
      // レンダラープロセスでVRM情報を取得するJavaScriptを実行
      const expressions = await mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            console.log('[Renderer] グローバルVRM表情関数の確認');
            
            if (window.vrmExpression && typeof window.vrmExpression.getAvailableExpressions === 'function') {
              console.log('[Renderer] グローバルvrmExpression関数が見つかりました');
              const result = window.vrmExpression.getAvailableExpressions();
              console.log('[Renderer] グローバルVRM表情取得結果:', Array.isArray(result) ? result.length : 'not array', result);
              return result;
            } else {
              console.error('[Renderer] グローバルvrmExpression関数が見つかりません');
              console.log('[Renderer] window.vrmExpression状態:', typeof window.vrmExpression);
              return [];
            }
          } catch (error) {
            console.error('[Renderer] VRM表情取得エラー:', error);
            console.error('[Renderer] エラースタック:', error.stack);
            return [];
          }
        })()
      `);
      
      console.log('[Main] レンダラーから取得された表情数:', expressions.length);
      return expressions;
    } catch (error) {
      console.error('利用可能表情の取得エラー:', error);
      return [];
    }
  });

  ipcMain.handle('get-expression-settings', async () => {
    try {
      return settingsStore.getExpressionSettings();
    } catch (error) {
      console.error('表情設定の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle('set-expression-settings', async (_event: IpcMainInvokeEvent, settings: ExpressionSettings) => {
    try {
      settingsStore.setExpressionSettings(settings);
      return { success: true };
    } catch (error) {
      console.error('表情設定の保存エラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });

  ipcMain.handle('update-expression-setting', async (_event: IpcMainInvokeEvent, expressionName: string, enabled: boolean, defaultWeight: number) => {
    try {
      settingsStore.updateExpressionSetting(expressionName, enabled, defaultWeight);
      return { success: true };
    } catch (error) {
      console.error('表情設定の更新エラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });

  ipcMain.handle('reset-expression-settings', async () => {
    try {
      settingsStore.resetExpressionSettings();
      return { success: true };
    } catch (error) {
      console.error('表情設定のリセットエラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });

  ipcMain.handle('preview-expression', async (_event: IpcMainInvokeEvent, expressionName: string, intensity?: number) => {
    try {
      console.log('[Main] 表情プレビュー:', expressionName, intensity);
      
      // メインウィンドウ（レンダラープロセス）で直接表情を適用
      const mainWindow = windowManagerController.getMainWindow();
      if (!mainWindow) {
        console.warn('[Main] メインウィンドウが見つかりません');
        return { success: false, error: 'メインウィンドウが見つかりません' };
      }
      
      // レンダラープロセスで表情を適用するJavaScriptを実行
      const success = await mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            if (window.vrmExpression && typeof window.vrmExpression.applyExpression === 'function') {
              const result = window.vrmExpression.applyExpression('${expressionName}', ${intensity || 1.0});
              console.log('[Renderer] グローバル表情適用結果:', result);
              return result;
            } else {
              console.error('[Renderer] グローバルvrmExpression.applyExpression関数が見つかりません');
              return false;
            }
          } catch (error) {
            console.error('[Renderer] 表情適用エラー:', error);
            return false;
          }
        })()
      `);
      
      console.log('[Main] レンダラーでの表情適用結果:', success);
      return { success };
    } catch (error) {
      console.error('表情プレビューエラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });

  ipcMain.handle('update-tools-and-reinitialize-gemini', async () => {
    try {
      console.log('[Main] tools.json更新とGeminiService再初期化を開始');
      
      // 動的tools.json生成
      await generateDynamicToolsJson(windowManagerController, settingsStore);
      
      // GeminiServiceを再初期化（APIキーを取得して渡す）
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API キーが環境変数に設定されていません (.env ファイルの GEMINI_API_KEY を確認してください)');
      }
      await reinitializeGemini(apiKey);
      
      console.log('[Main] tools.json更新とGeminiService再初期化が完了');
      return { success: true };
    } catch (error) {
      console.error('[Main] tools.json更新エラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });

  // デフォルト表情関連のIPCハンドラー
  ipcMain.handle(IPC_CHANNELS.EXPRESSION.GET_DEFAULT_EXPRESSION, async () => {
    try {
      return settingsStore.getDefaultExpression();
    } catch (error) {
      console.error('デフォルト表情の取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPRESSION.SET_DEFAULT_EXPRESSION, async (_event: IpcMainInvokeEvent, expressionName: string) => {
    try {
      settingsStore.setDefaultExpression(expressionName);
      return { success: true };
    } catch (error) {
      console.error('デフォルト表情の設定エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.EXPRESSION.RESET_TO_DEFAULT, async () => {
    try {
      const mainWindow = windowManagerController.getMainWindow();
      SpeechBubbleManager.resetToDefaultExpression(mainWindow);
      return { success: true };
    } catch (error) {
      console.error('デフォルト表情リセットエラー:', error);
      return { success: false, error: error instanceof Error ? error.message : '不明なエラー' };
    }
  });
}