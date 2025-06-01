import { ipcMain, IpcMainInvokeEvent, BrowserWindow } from 'electron';

import { IPC_CHANNELS } from '../../config/ipcChannels';
import { SettingsStore } from '../../utils/settingsStore';

export function setupThemeHandlers(
  settingsStore: SettingsStore
): void {
  // テーマ関連のIPCハンドラー
  ipcMain.handle(IPC_CHANNELS.THEME.GET_THEME, async () => {
    try {
      return settingsStore.getTheme();
    } catch (error) {
      console.error('テーマの取得エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.THEME.SET_THEME, async (_event: IpcMainInvokeEvent, theme: string) => {
    try {
      settingsStore.setTheme(theme);
      
      // すべてのウィンドウにテーマ変更を通知
      const windows = BrowserWindow.getAllWindows();
      windows.forEach(window => {
        window.webContents.send('theme-changed', theme);
      });
      
      console.log(`テーマを ${theme} に変更し、${windows.length} 個のウィンドウに通知しました`);
      return { success: true };
    } catch (error) {
      console.error('テーマの設定エラー:', error);
      throw error;
    }
  });

  ipcMain.handle(IPC_CHANNELS.THEME.GET_AVAILABLE_THEMES, async () => {
    try {
      // 利用可能なテーマ一覧を返す
      const themes = [
        {
          id: 'default',
          name: 'ソフト＆ドリーミー',
          description: '明るく親しみやすい、やわらかな印象のテーマ',
          preview: {
            primary: '#5082C4',
            secondary: '#8E7CC3',
            accent: '#E91E63',
            background: '#FDFBF7'
          }
        },
        {
          id: 'dark',
          name: 'ダークモード',
          description: '目に優しく洗練された、落ち着いた印象のテーマ',
          preview: {
            primary: '#60A5FA',
            secondary: '#A78BFA',
            accent: '#FCD34D',
            background: '#0F172A'
          }
        },
        {
          id: 'sakura',
          name: 'サクラ',
          description: '桜の季節を思わせる、華やかで可愛らしいテーマ',
          preview: {
            primary: '#D1477A',
            secondary: '#C485C7',
            accent: '#FF5722',
            background: '#FDF2F8'
          }
        },
        {
          id: 'ocean',
          name: 'オーシャン',
          description: '海の爽やかさを表現した、清々しいテーマ',
          preview: {
            primary: '#0D7377',
            secondary: '#1E40AF',
            accent: '#DC7633',
            background: '#F0FDFA'
          }
        },
        {
          id: 'forest',
          name: 'フォレスト',
          description: '森の静寂をイメージした、落ち着いた自然派テーマ',
          preview: {
            primary: '#6B7280',
            secondary: '#8B7355',
            accent: '#2D8659',
            background: '#F9FAFB'
          }
        },
        {
          id: 'wonderland',
          name: 'ワンダーランド',
          description: '不思議の国のアリスの幻想世界をイメージした魔法的なテーマ',
          preview: {
            primary: '#7C3AED',
            secondary: '#EC4899',
            accent: '#10B981',
            background: '#FAF5FF'
          }
        }
      ];
      return themes;
    } catch (error) {
      console.error('利用可能テーマの取得エラー:', error);
      throw error;
    }
  });
}