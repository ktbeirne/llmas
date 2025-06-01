/**
 * Function Calling関連の型定義
 * @google/generative-ai のToolインターフェースに準拠
 */

/**
 * 関数パラメーターの定義
 */
export interface FunctionParameter {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  items?: FunctionParameter;
  properties?: Record<string, FunctionParameter>;
  required?: string[];
}

/**
 * 関数パラメーターのスキーマ定義
 */
export interface FunctionParametersSchema {
  type: 'object';
  properties: Record<string, FunctionParameter>;
  required?: string[];
}

/**
 * 関数の定義
 */
export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: FunctionParametersSchema;
}

/**
 * tools.jsonファイルの構造
 */
export type ToolsConfig = FunctionDefinition[];

/**
 * Function Call実行時の引数
 */
export interface FunctionCallArgs {
  [key: string]: any;
}

/**
 * Function Call実行結果
 */
export interface FunctionCallResult {
  success: boolean;
  result?: any;
  error?: string;
}

/**
 * LLMからのFunction Call要求
 */
export interface LLMFunctionCall {
  name: string;
  args: FunctionCallArgs;
}

/**
 * 表情制御関数の引数型定義
 */
export interface SetExpressionArgs {
  expression_name: string;
  intensity?: number;
}

/**
 * 表情設定データ（設定画面用）
 */
export interface ExpressionSettings {
  [expressionName: string]: {
    enabled: boolean;
    defaultWeight: number;
  };
}

/**
 * VRM表情情報
 */
export interface VRMExpressionInfo {
  name: string;
  displayName?: string;
  isPreset: boolean;
}