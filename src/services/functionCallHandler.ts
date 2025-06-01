import { LLMFunctionCall, FunctionCallResult, SetExpressionArgs } from '../types/tools';
import { SettingsStore } from '../utils/settingsStore';
import { WindowManager } from '../utils/WindowManager';

/**
 * Function Call実行ハンドラー
 * LLMからのFunction Call要求を実際の関数実行に変換
 */
export class FunctionCallHandler {
  private static instance: FunctionCallHandler | null = null;
  private settingsStore: SettingsStore;
  private windowManager: WindowManager | null = null;

  private constructor() {
    this.settingsStore = new SettingsStore();
  }
  
  /**
   * WindowManagerを設定（main.tsから注入）
   */
  setWindowManager(windowManager: WindowManager): void {
    this.windowManager = windowManager;
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): FunctionCallHandler {
    if (!this.instance) {
      this.instance = new FunctionCallHandler();
    }
    return this.instance;
  }

  /**
   * Function Callを実行
   */
  async executeFunction(functionCall: LLMFunctionCall): Promise<FunctionCallResult> {
    console.log(`[FunctionCallHandler] 関数実行: ${functionCall.name}`, functionCall.args);

    try {
      switch (functionCall.name) {
        case 'set_expression':
          return this.executeSetExpression(functionCall.args as SetExpressionArgs);
        
        case 'get_weather_forecast':
          return this.executeGetWeatherForecast(functionCall.args);
        
        case 'set_reminder':
          return this.executeSetReminder(functionCall.args);
        
        default:
          throw new Error(`未知の関数: ${functionCall.name}`);
      }
    } catch (error) {
      console.error(`[FunctionCallHandler] 関数実行エラー (${functionCall.name}):`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー'
      };
    }
  }

  /**
   * set_expression関数の実行
   */
  private async executeSetExpression(args: SetExpressionArgs): Promise<FunctionCallResult> {
    const { expression_name, intensity } = args;

    if (!expression_name || typeof expression_name !== 'string') {
      throw new Error('expression_name は必須の文字列パラメータです');
    }

    // 表情名の検証
    if (!this.isValidExpressionName(expression_name)) {
      throw new Error(`無効な表情名: ${expression_name}`);
    }

    // 強度の決定（LLM指定 > 設定値 > デフォルト1.0）
    let targetIntensity: number;
    if (intensity !== undefined) {
      if (typeof intensity !== 'number' || intensity < 0 || intensity > 1) {
        throw new Error('intensity は0.0-1.0の範囲の数値である必要があります');
      }
      targetIntensity = intensity;
    } else {
      // 設定からデフォルト強度を取得
      targetIntensity = this.settingsStore.getExpressionDefaultWeight(expression_name);
    }

    // 表情の有効性チェック（詳細デバッグ）
    const isEnabled = this.settingsStore.isExpressionEnabled(expression_name);
    const allExpressionSettings = this.settingsStore.getExpressionSettings();
    const specificSetting = allExpressionSettings[expression_name];
    
    console.log(`[FunctionCallHandler] 表情設定デバッグ:`);
    console.log(`  - 表情名: ${expression_name}`);
    console.log(`  - 有効性: ${isEnabled}`);
    console.log(`  - 個別設定:`, specificSetting);
    console.log(`  - 全表情設定:`, Object.keys(allExpressionSettings));
    
    if (!isEnabled) {
      console.warn(`[FunctionCallHandler] 表情 '${expression_name}' は設定で無効化されています - 自動有効化を試行`);
      
      // 表情が無効な場合、自動的に有効化を試行
      try {
        this.settingsStore.updateExpressionSetting(expression_name, true, 1.0);
        console.log(`[FunctionCallHandler] 表情 '${expression_name}' を自動有効化しました`);
      } catch (autoEnableError) {
        console.error(`[FunctionCallHandler] 表情 '${expression_name}' の自動有効化に失敗:`, autoEnableError);
        return {
          success: false,
          error: `表情 '${expression_name}' は現在無効に設定されており、自動有効化にも失敗しました。設定画面で手動で有効化してください。`
        };
      }
    }

    // レンダラープロセス経由で表情を適用
    if (!this.windowManager) {
      throw new Error('WindowManagerが設定されていません');
    }
    
    const mainWindow = this.windowManager.getWindow('main');
    if (!mainWindow) {
      throw new Error('メインウィンドウが見つかりません');
    }
    
    try {
      const success = await mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            console.log('[Renderer] Function Call表情適用開始:', '${expression_name}', ${targetIntensity});
            
            if (window.vrmExpression && typeof window.vrmExpression.applyExpression === 'function') {
              
              // 利用可能な表情をチェック
              const availableExpressions = window.vrmExpression.getAvailableExpressions();
              console.log('[Renderer] 利用可能な表情:', availableExpressions.map(e => e.name));
              
              // 大文字小文字を考慮した表情名検索
              const exactMatch = availableExpressions.find(e => e.name === '${expression_name}');
              const caseInsensitiveMatch = availableExpressions.find(e => e.name.toLowerCase() === '${expression_name}'.toLowerCase());
              
              console.log('[Renderer] 完全一致:', exactMatch);
              console.log('[Renderer] 大文字小文字無視一致:', caseInsensitiveMatch);
              
              const targetExpression = exactMatch || caseInsensitiveMatch;
              
              if (!targetExpression) {
                console.error('[Renderer] 表情が見つかりません:', '${expression_name}');
                return { success: false, error: '表情が見つかりません: ${expression_name}' };
              }
              
              const result = window.vrmExpression.applyExpression(targetExpression.name, ${targetIntensity});
              console.log('[Renderer] Function Call表情適用結果:', result, 'for expression:', targetExpression.name);
              return { success: result, usedExpression: targetExpression.name };
            } else {
              console.error('[Renderer] グローバルvrmExpression.applyExpression関数が見つかりません');
              return { success: false, error: 'vrmExpression.applyExpression関数が見つかりません' };
            }
          } catch (error) {
            console.error('[Renderer] Function Call表情適用エラー:', error);
            return { success: false, error: error.message };
          }
        })()
      `);
      
      console.log('[FunctionCallHandler] レンダラーからの応答:', success);
      
      if (success && success.success) {
        const usedExpression = success.usedExpression || expression_name;
        return {
          success: true,
          result: `表情 '${usedExpression}' を強度 ${targetIntensity.toFixed(1)} で適用しました。`
        };
      } else {
        const errorMessage = success && success.error ? success.error : `表情 '${expression_name}' の適用に失敗しました`;
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('[FunctionCallHandler] レンダラープロセス表情適用エラー:', error);
      throw new Error(`表情 '${expression_name}' の適用に失敗しました`);
    }
  }

  /**
   * get_weather_forecast関数の実行（デモ用）
   */
  private executeGetWeatherForecast(args: any): FunctionCallResult {
    const { city } = args;

    if (!city || typeof city !== 'string') {
      throw new Error('city は必須の文字列パラメータです');
    }

    // デモ用のレスポンス
    const demoWeather = {
      city,
      temperature: Math.floor(Math.random() * 30) + 5, // 5-35°C
      condition: ['晴れ', '曇り', '雨', '雪'][Math.floor(Math.random() * 4)],
      humidity: Math.floor(Math.random() * 40) + 40, // 40-80%
      timestamp: new Date().toLocaleString('ja-JP')
    };

    return {
      success: true,
      result: `${demoWeather.city}の現在の天気: ${demoWeather.condition}、気温${demoWeather.temperature}°C、湿度${demoWeather.humidity}% (${demoWeather.timestamp}時点のデモデータ)`
    };
  }

  /**
   * set_reminder関数の実行（デモ用）
   */
  private executeSetReminder(args: any): FunctionCallResult {
    const { time, task } = args;

    if (!time || typeof time !== 'string') {
      throw new Error('time は必須の文字列パラメータです');
    }

    if (!task || typeof task !== 'string') {
      throw new Error('task は必須の文字列パラメータです');
    }

    // デモ用のレスポンス
    const reminderId = Math.random().toString(36).substr(2, 9);

    return {
      success: true,
      result: `リマインダーを設定しました: "${task}" (時刻: ${time}, ID: ${reminderId})`
    };
  }

  /**
   * 表情名の妥当性をチェック
   */
  private isValidExpressionName(name: string): boolean {
    // 基本的な表情名のパターンチェック
    const validPattern = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    if (!validPattern.test(name)) {
      return false;
    }

    // 長さチェック
    if (name.length > 50) {
      return false;
    }

    return true;
  }

  /**
   * 複数のFunction Callを順次実行
   */
  async executeFunctions(functionCalls: LLMFunctionCall[]): Promise<FunctionCallResult[]> {
    const results: FunctionCallResult[] = [];

    for (const functionCall of functionCalls) {
      const result = await this.executeFunction(functionCall);
      results.push(result);
      
      // エラーが発生した場合は後続の実行を停止
      if (!result.success) {
        console.error(`[FunctionCallHandler] 関数実行が失敗したため、後続の実行を停止: ${functionCall.name}`);
        break;
      }
    }

    return results;
  }

  /**
   * Function Call結果をLLM用の応答形式に変換
   */
  formatResultForLLM(functionCall: LLMFunctionCall, result: FunctionCallResult): string {
    if (result.success) {
      return `[${functionCall.name}] ${result.result}`;
    } else {
      return `[${functionCall.name}] エラー: ${result.error}`;
    }
  }

  /**
   * 複数のFunction Call結果をまとめて整形
   */
  formatResultsForLLM(functionCalls: LLMFunctionCall[], results: FunctionCallResult[]): string {
    const formattedResults = functionCalls.map((call, index) => {
      const result = results[index];
      if (!result) return `[${call.name}] 実行されませんでした`;
      return this.formatResultForLLM(call, result);
    });

    return formattedResults.join('\n');
  }
}

// 後方互換性のための関数
const functionCallHandler = FunctionCallHandler.getInstance();

export async function executeFunction(functionCall: LLMFunctionCall): Promise<FunctionCallResult> {
  return functionCallHandler.executeFunction(functionCall);
}

export async function executeFunctions(functionCalls: LLMFunctionCall[]): Promise<FunctionCallResult[]> {
  return functionCallHandler.executeFunctions(functionCalls);
}

export function formatResultForLLM(functionCall: LLMFunctionCall, result: FunctionCallResult): string {
  return functionCallHandler.formatResultForLLM(functionCall, result);
}

export function formatResultsForLLM(functionCalls: LLMFunctionCall[], results: FunctionCallResult[]): string {
  return functionCallHandler.formatResultsForLLM(functionCalls, results);
}