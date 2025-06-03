/**
 * DOM固有型定義
 * 
 * VanillaJS実装で使用するDOM要素関連の型定義
 * React移行時にはこのファイルは使用されなくなる
 */

/**
 * DOM要素管理用の基底インターフェース
 */
export interface BaseSettingsElements {
  [key: string]: HTMLElement | null;
}

/**
 * ウィンドウ設定用DOM要素
 */
export interface WindowSettingsElements extends BaseSettingsElements {
  presetSelect: HTMLSelectElement;
  customWidthInput: HTMLInputElement;
  customHeightInput: HTMLInputElement;
  customSizeInputs: HTMLElement;
  currentVrmPath: HTMLInputElement;
  selectVrmButton: HTMLButtonElement;
  applyButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
}

/**
 * チャット設定用DOM要素
 */
export interface ChatSettingsElements extends BaseSettingsElements {
  userNameInput: HTMLInputElement;
  mascotNameInput: HTMLInputElement;
  systemPromptCoreTextarea: HTMLTextAreaElement;
  promptCharacterCount: HTMLElement;
  performanceWarning: HTMLElement;
  resetSystemPromptButton: HTMLButtonElement;
  clearChatHistoryButton: HTMLButtonElement;
  applyButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
}

/**
 * テーマ設定用DOM要素
 */
export interface ThemeSettingsElements extends BaseSettingsElements {
  themeGrid: HTMLElement;
  themeHeader: HTMLElement;
  themeContent: HTMLElement;
}

/**
 * 表情設定用DOM要素
 */
export interface ExpressionSettingsElements extends BaseSettingsElements {
  expressionList: HTMLElement;
  expressionLoading: HTMLElement;
  expressionError: HTMLElement;
  previewExpressionSelect: HTMLSelectElement;
  previewIntensity: HTMLInputElement;
  previewIntensityValue: HTMLElement;
  previewExpressionBtn: HTMLButtonElement;
  resetExpressionBtn: HTMLButtonElement;
  saveExpressionsBtn: HTMLButtonElement;
  resetExpressionsBtn: HTMLButtonElement;
  applyButton: HTMLButtonElement;
  resetButton: HTMLButtonElement;
}