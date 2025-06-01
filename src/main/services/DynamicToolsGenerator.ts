import path from 'node:path';
import fs from 'node:fs';

import { app } from 'electron';

import { SettingsStore } from '../../utils/settingsStore';
import { ToolsService } from '../../services/toolsService';
import { VRMExpressionInfo, ToolsConfig } from '../../types/tools';
import { WindowManagerController } from '../windows/WindowManagerController';

/**
 * 有効な表情に基づいてtools.jsonを動的生成
 */
export async function generateDynamicToolsJson(
  windowManagerController: WindowManagerController,
  settingsStore: SettingsStore
): Promise<void> {
  try {
    console.log('[Main] 動的tools.json生成を開始');
    
    // メインウィンドウから利用可能な表情を取得
    const mainWindow = windowManagerController.getMainWindow();
    if (!mainWindow) {
      throw new Error('メインウィンドウが見つかりません');
    }
    
    const availableExpressions = await mainWindow.webContents.executeJavaScript(`
      (() => {
        if (window.vrmExpression && typeof window.vrmExpression.getAvailableExpressions === 'function') {
          return window.vrmExpression.getAvailableExpressions();
        }
        return [];
      })()
    `);
    
    // 現在の表情設定を取得
    const expressionSettings = settingsStore.getExpressionSettings();
    
    // 表情名の重複と大文字小文字の問題を解決
    const uniqueExpressions = availableExpressions.reduce((acc: VRMExpressionInfo[], expr: VRMExpressionInfo) => {
      const existingIndex = acc.findIndex((e: VRMExpressionInfo) => e.name.toLowerCase() === expr.name.toLowerCase());
      if (existingIndex === -1) {
        acc.push(expr);
      } else {
        // 既存のものと比較して、より適切な名前を選択（小文字を優先）
        const existing = acc[existingIndex];
        if (expr.name.toLowerCase() === expr.name && existing.name !== existing.name.toLowerCase()) {
          acc[existingIndex] = expr; // 小文字版を優先
        }
      }
      return acc;
    }, []);
    
    // 有効な表情のみをフィルタ（詳細デバッグ）
    console.log('[Main] 表情フィルタリング詳細:');
    console.log('  - 利用可能表情（重複除去後):', uniqueExpressions.map((e: VRMExpressionInfo) => e.name));
    console.log('  - 表情設定:', expressionSettings);
    
    const enabledExpressions = uniqueExpressions.filter((expr: VRMExpressionInfo) => {
      const setting = expressionSettings[expr.name];
      const isEnabled = setting && setting.enabled;
      console.log(`  - ${expr.name}: 設定=${JSON.stringify(setting)}, 有効=${isEnabled}`);
      return isEnabled;
    });
    
    // 有効な表情がない場合、利用可能な全表情を自動的に有効化
    if (enabledExpressions.length === 0 && uniqueExpressions.length > 0) {
      console.log('[Main] 有効な表情がないため、利用可能な全表情を自動有効化します');
      for (const expr of uniqueExpressions) {
        settingsStore.updateExpressionSetting(expr.name, true, 1.0);
        enabledExpressions.push(expr);
        console.log(`[Main] 自動有効化: ${expr.name}`);
      }
    }
    
    console.log('[Main] 有効な表情数:', enabledExpressions.length);
    console.log('[Main] 有効な表情名:', enabledExpressions.map((e: VRMExpressionInfo) => e.name));
    
    // ToolsServiceを使用してtools.jsonを読み込み
    const toolsService = ToolsService.getInstance();
    if (!toolsService.isToolsLoaded()) {
      await toolsService.loadTools();
    }
    const originalTools = toolsService.getTools();
    
    // set_expression関数の説明を動的更新
    const setExpressionTool = originalTools.find((tool: ToolsConfig[0]) => tool.name === 'set_expression');
    if (setExpressionTool && enabledExpressions.length > 0) {
      const expressionNames = enabledExpressions.map((expr: VRMExpressionInfo) => expr.name).join(', ');
      setExpressionTool.description = `VRMマスコットの表情を設定します。利用可能な表情: ${expressionNames}`;
      
      // enumに有効な表情名を追加
      setExpressionTool.parameters.properties.expression_name.enum = enabledExpressions.map((expr: VRMExpressionInfo) => expr.name);
    }
    
    // 動的tools.jsonを保存（複数の場所に保存して確実にアクセス可能にする）
    const appPath = app.getAppPath();
    
    const dynamicToolsPaths = [
      path.join(__dirname, 'tools.json'),
      path.join(appPath, 'tools.json'),
      path.join(process.cwd(), 'tools.json')
    ];
    
    for (const dynamicPath of dynamicToolsPaths) {
      try {
        fs.writeFileSync(dynamicPath, JSON.stringify(originalTools, null, 2));
        console.log('[Main] 動的tools.json保存完了:', dynamicPath);
      } catch (error) {
        console.warn('[Main] 動的tools.json保存失敗:', dynamicPath, error instanceof Error ? error.message : String(error));
      }
    }
    
    // ToolsServiceに動的更新されたツールを再読み込みさせる
    await toolsService.reloadTools();
    console.log('[Main] ToolsService再読み込み完了');
  } catch (error) {
    console.error('[Main] 動的tools.json生成エラー:', error);
    throw error;
  }
}