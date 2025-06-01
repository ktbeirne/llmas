/**
 * Function Callオーケストレーションのドメインサービス
 * AIサービスからのFunction Call要求の処理、実行、結果の整形を担当
 */

import { LLMFunctionCall, FunctionCallResult } from '../../types/tools';

/**
 * Function Callの実行結果
 */
export interface FunctionExecutionResult {
  functionCall: LLMFunctionCall;
  result: FunctionCallResult;
  executionTime: number;
  success: boolean;
  error?: string;
}

/**
 * Function Callの統計情報
 */
export interface FunctionCallStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  averageExecutionTime: number;
  mostUsedFunctions: Array<{ name: string; count: number }>;
  recentErrors: Array<{ functionName: string; error: string; timestamp: Date }>;
}

/**
 * Function Callのセキュリティ設定
 */
export interface FunctionCallSecurityConfig {
  enableWhitelist: boolean;
  allowedFunctions: string[];
  blockedFunctions: string[];
  maxExecutionTime: number;
  maxConcurrentCalls: number;
  enableAuditLog: boolean;
}

/**
 * Function Callの実行コンテキスト
 */
export interface FunctionExecutionContext {
  userId: string;
  sessionId: string;
  timestamp: Date;
  requestId: string;
  securityLevel: 'low' | 'medium' | 'high';
}

/**
 * Function Callオーケストレーションサービス
 */
export class FunctionCallOrchestrator {
  private static readonly DEFAULT_SECURITY_CONFIG: FunctionCallSecurityConfig = {
    enableWhitelist: false,
    allowedFunctions: [],
    blockedFunctions: ['eval', 'exec', 'system'],
    maxExecutionTime: 30000, // 30秒
    maxConcurrentCalls: 5,
    enableAuditLog: true
  };

  private executionHistory: FunctionExecutionResult[] = [];
  private activeCalls: Map<string, Promise<FunctionCallResult>> = new Map();
  private securityConfig: FunctionCallSecurityConfig;
  private functionRegistry: Map<string, Function> = new Map();

  constructor(securityConfig: Partial<FunctionCallSecurityConfig> = {}) {
    this.securityConfig = {
      ...FunctionCallOrchestrator.DEFAULT_SECURITY_CONFIG,
      ...securityConfig
    };
  }

  /**
   * Functionを登録
   */
  registerFunction(name: string, implementation: Function): void {
    if (this.isBlocked(name)) {
      throw new Error(`Function '${name}' is blocked by security policy`);
    }
    
    this.functionRegistry.set(name, implementation);
    console.log(`Function '${name}' registered successfully`);
  }

  /**
   * 登録されているFunctionの一覧を取得
   */
  getRegisteredFunctions(): string[] {
    return Array.from(this.functionRegistry.keys());
  }

  /**
   * Function Callの一括実行
   */
  async executeFunctionCalls(
    functionCalls: LLMFunctionCall[],
    context: FunctionExecutionContext
  ): Promise<FunctionExecutionResult[]> {
    // 同時実行数のチェック
    if (this.activeCalls.size + functionCalls.length > this.securityConfig.maxConcurrentCalls) {
      throw new Error(
        `Too many concurrent function calls. Max: ${this.securityConfig.maxConcurrentCalls}, ` +
        `Active: ${this.activeCalls.size}, Requested: ${functionCalls.length}`
      );
    }

    const results: FunctionExecutionResult[] = [];
    
    // 各Function Callを並列実行
    const executionPromises = functionCalls.map(async (functionCall) => {
      return this.executeSingleFunction(functionCall, context);
    });

    const executionResults = await Promise.allSettled(executionPromises);
    
    for (let i = 0; i < executionResults.length; i++) {
      const result = executionResults[i];
      const functionCall = functionCalls[i];
      
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        // 失敗した場合のエラー結果を作成
        const errorResult: FunctionExecutionResult = {
          functionCall,
          result: {
            success: false,
            error: result.reason?.message || 'Unknown execution error',
            data: null
          },
          executionTime: 0,
          success: false,
          error: result.reason?.message || 'Unknown execution error'
        };
        results.push(errorResult);
      }
    }

    // 実行結果を履歴に追加
    this.executionHistory.push(...results);
    
    // 履歴のサイズ制限
    if (this.executionHistory.length > 1000) {
      this.executionHistory = this.executionHistory.slice(-500);
    }

    return results;
  }

  /**
   * 単一Functionの実行
   */
  async executeSingleFunction(
    functionCall: LLMFunctionCall,
    context: FunctionExecutionContext
  ): Promise<FunctionExecutionResult> {
    const startTime = Date.now();
    const callId = `${functionCall.name}_${startTime}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // セキュリティチェック
      this.validateFunctionCall(functionCall, context);
      
      // Functionの存在確認
      const implementation = this.functionRegistry.get(functionCall.name);
      if (!implementation) {
        throw new Error(`Function '${functionCall.name}' is not registered`);
      }

      // タイムアウト付きで実行
      const executionPromise = this.executeWithTimeout(
        implementation,
        functionCall.args,
        this.securityConfig.maxExecutionTime
      );
      
      this.activeCalls.set(callId, executionPromise);
      
      const result = await executionPromise;
      const executionTime = Date.now() - startTime;
      
      const executionResult: FunctionExecutionResult = {
        functionCall,
        result,
        executionTime,
        success: result.success,
        error: result.success ? undefined : result.error
      };
      
      // 監査ログ
      if (this.securityConfig.enableAuditLog) {
        this.logFunctionExecution(executionResult, context);
      }
      
      return executionResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      const executionResult: FunctionExecutionResult = {
        functionCall,
        result: {
          success: false,
          error: errorMessage,
          data: null
        },
        executionTime,
        success: false,
        error: errorMessage
      };
      
      // エラーログ
      if (this.securityConfig.enableAuditLog) {
        this.logFunctionExecution(executionResult, context);
      }
      
      return executionResult;
    } finally {
      this.activeCalls.delete(callId);
    }
  }

  /**
   * Function Call結果をLLM用に整形
   */
  formatResultsForLLM(results: FunctionExecutionResult[]): string {
    if (results.length === 0) {
      return 'No function calls were executed.';
    }

    const formattedResults = results.map((result, index) => {
      const { functionCall, result: callResult, success, executionTime } = result;
      
      let resultText = `\n=== Function Call ${index + 1}: ${functionCall.name} ===\n`;
      resultText += `Arguments: ${JSON.stringify(functionCall.args, null, 2)}\n`;
      resultText += `Execution Time: ${executionTime}ms\n`;
      resultText += `Status: ${success ? 'SUCCESS' : 'FAILED'}\n`;
      
      if (success && callResult.data) {
        resultText += `Result: ${this.formatResultData(callResult.data)}\n`;
      } else if (!success && callResult.error) {
        resultText += `Error: ${callResult.error}\n`;
      }
      
      return resultText;
    });

    return `Function Call Execution Results:\n${formattedResults.join('\n')}`;
  }

  /**
   * 統計情報を取得
   */
  getStatistics(): FunctionCallStats {
    const totalCalls = this.executionHistory.length;
    const successfulCalls = this.executionHistory.filter(r => r.success).length;
    const failedCalls = totalCalls - successfulCalls;
    
    const totalExecutionTime = this.executionHistory.reduce((sum, r) => sum + r.executionTime, 0);
    const averageExecutionTime = totalCalls > 0 ? totalExecutionTime / totalCalls : 0;
    
    // 最も使用された関数の集計
    const functionUsage = new Map<string, number>();
    this.executionHistory.forEach(r => {
      const count = functionUsage.get(r.functionCall.name) || 0;
      functionUsage.set(r.functionCall.name, count + 1);
    });
    
    const mostUsedFunctions = Array.from(functionUsage.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // 最近のエラー
    const recentErrors = this.executionHistory
      .filter(r => !r.success)
      .slice(-10)
      .map(r => ({
        functionName: r.functionCall.name,
        error: r.error || 'Unknown error',
        timestamp: new Date()
      }));
    
    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      averageExecutionTime,
      mostUsedFunctions,
      recentErrors
    };
  }

  /**
   * アクティブな呼び出し数を取得
   */
  getActiveCalls(): number {
    return this.activeCalls.size;
  }

  /**
   * セキュリティ設定を更新
   */
  updateSecurityConfig(config: Partial<FunctionCallSecurityConfig>): void {
    this.securityConfig = { ...this.securityConfig, ...config };
    console.log('Function Call security config updated:', this.securityConfig);
  }

  /**
   * 実行履歴をクリア
   */
  clearExecutionHistory(): void {
    this.executionHistory = [];
    console.log('Function execution history cleared');
  }

  // プライベートメソッド

  /**
   * Function Callのバリデーション
   */
  private validateFunctionCall(
    functionCall: LLMFunctionCall,
    context: FunctionExecutionContext
  ): void {
    // ホワイトリストチェック
    if (this.securityConfig.enableWhitelist) {
      if (!this.securityConfig.allowedFunctions.includes(functionCall.name)) {
        throw new Error(`Function '${functionCall.name}' is not in the allowed list`);
      }
    }
    
    // ブラックリストチェック
    if (this.isBlocked(functionCall.name)) {
      throw new Error(`Function '${functionCall.name}' is blocked by security policy`);
    }
    
    // 引数のバリデーション
    if (!functionCall.args || typeof functionCall.args !== 'object') {
      throw new Error('Function arguments must be a valid object');
    }
    
    // セキュリティレベルチェック
    if (context.securityLevel === 'high') {
      // 高セキュリティレベルでの追加チェック
      this.validateHighSecurityFunction(functionCall);
    }
  }

  /**
   * 高セキュリティレベルでの追加バリデーション
   */
  private validateHighSecurityFunction(functionCall: LLMFunctionCall): void {
    // 危険なパラメータのチェック
    const dangerousPatterns = [
      /eval\s*\(/,
      /exec\s*\(/,
      /system\s*\(/,
      /require\s*\(/,
      /import\s*\(/,
      /__proto__/,
      /constructor/,
      /prototype/
    ];
    
    const argsString = JSON.stringify(functionCall.args);
    for (const pattern of dangerousPatterns) {
      if (pattern.test(argsString)) {
        throw new Error(`Dangerous pattern detected in function arguments: ${pattern}`);
      }
    }
  }

  /**
   * Functionがブロックされているかチェック
   */
  private isBlocked(functionName: string): boolean {
    return this.securityConfig.blockedFunctions.includes(functionName);
  }

  /**
   * タイムアウト付きでFunctionを実行
   */
  private async executeWithTimeout(
    implementation: Function,
    args: any,
    timeout: number
  ): Promise<FunctionCallResult> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Function execution timed out after ${timeout}ms`));
      }, timeout);
      
      try {
        const result = implementation(args);
        
        // Promiseかどうかをチェック
        if (result && typeof result.then === 'function') {
          result
            .then((data: any) => {
              clearTimeout(timeoutId);
              resolve({ success: true, data, error: null });
            })
            .catch((error: any) => {
              clearTimeout(timeoutId);
              resolve({ 
                success: false, 
                data: null, 
                error: error instanceof Error ? error.message : String(error) 
              });
            });
        } else {
          clearTimeout(timeoutId);
          resolve({ success: true, data: result, error: null });
        }
      } catch (error) {
        clearTimeout(timeoutId);
        resolve({ 
          success: false, 
          data: null, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    });
  }

  /**
   * Function実行をログ出力
   */
  private logFunctionExecution(
    result: FunctionExecutionResult,
    context: FunctionExecutionContext
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      userId: context.userId,
      sessionId: context.sessionId,
      requestId: context.requestId,
      functionName: result.functionCall.name,
      arguments: result.functionCall.args,
      success: result.success,
      executionTime: result.executionTime,
      error: result.error,
      securityLevel: context.securityLevel
    };
    
    console.log('[FUNCTION_CALL_AUDIT]', JSON.stringify(logEntry));
  }

  /**
   * 結果データを整形
   */
  private formatResultData(data: any): string {
    if (data === null || data === undefined) {
      return 'null';
    }
    
    if (typeof data === 'string') {
      return data;
    }
    
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch (error) {
        return '[Circular or non-serializable object]';
      }
    }
    
    return String(data);
  }
}