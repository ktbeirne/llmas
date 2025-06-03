/**
 * IPCメッセージのバリデーション機能を提供するクラス
 */

import { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  isString, 
  isNumber, 
  isBoolean, 
  isObject
} from '../types';

export class MessageValidator {
  private static readonly MAX_STRING_LENGTH = 10000;
  private static readonly MAX_PROMPT_LENGTH = 50000;
  private static readonly MIN_WINDOW_SIZE = 100;
  private static readonly MAX_WINDOW_SIZE = 5000;
  private static readonly VALID_THEMES = ['light', 'dark', 'auto'];
  private static readonly VALID_ROLES = ['user', 'assistant', 'system'];
  
  // XSS攻撃を検出するための基本的なパターン
  private static readonly XSS_PATTERNS = [
    /<script.*?>.*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe.*?>/gi,
    /<object.*?>/gi,
    /<embed.*?>/gi
  ];

  /**
   * 文字列の基本バリデーション
   */
  public static validateString(
    value: unknown,
    fieldName: string,
    options: {
      required?: boolean;
      minLength?: number;
      maxLength?: number;
      allowEmpty?: boolean;
      pattern?: RegExp;
      noXSS?: boolean;
    } = {}
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const {
      required = false,
      minLength = 0,
      maxLength = this.MAX_STRING_LENGTH,
      allowEmpty = true,
      pattern,
      noXSS = true
    } = options;

    // 必須チェック
    if (required && (value === undefined || value === null)) {
      errors.push({
        field: fieldName,
        message: `${fieldName}は必須です`,
        code: 'REQUIRED',
        value
      });
      return errors;
    }

    // 値が存在しない場合はOK（必須チェックは上で済んでいる）
    if (value === undefined || value === null) {
      return errors;
    }

    // 型チェック
    if (!isString(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName}は文字列である必要があります`,
        code: 'INVALID_TYPE',
        value
      });
      return errors;
    }

    // 空文字チェック
    if (!allowEmpty && value.trim() === '') {
      errors.push({
        field: fieldName,
        message: `${fieldName}は空文字にできません`,
        code: 'EMPTY_STRING',
        value
      });
    }

    // 長さチェック
    if (value.length < minLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName}は${minLength}文字以上である必要があります`,
        code: 'TOO_SHORT',
        value
      });
    }

    if (value.length > maxLength) {
      errors.push({
        field: fieldName,
        message: `${fieldName}は${maxLength}文字以下である必要があります`,
        code: 'TOO_LONG',
        value
      });
    }

    // パターンマッチング
    if (pattern && !pattern.test(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName}の形式が正しくありません`,
        code: 'INVALID_PATTERN',
        value
      });
    }

    // XSSチェック
    if (noXSS && this.containsXSS(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName}に危険なスクリプトが含まれています`,
        code: 'XSS_DETECTED',
        value
      });
    }

    return errors;
  }

  /**
   * 数値の基本バリデーション
   */
  public static validateNumber(
    value: unknown,
    fieldName: string,
    options: {
      required?: boolean;
      min?: number;
      max?: number;
      integer?: boolean;
    } = {}
  ): ValidationError[] {
    const errors: ValidationError[] = [];
    const { required = false, min, max, integer = false } = options;

    // 必須チェック
    if (required && (value === undefined || value === null)) {
      errors.push({
        field: fieldName,
        message: `${fieldName}は必須です`,
        code: 'REQUIRED',
        value
      });
      return errors;
    }

    // 値が存在しない場合はOK
    if (value === undefined || value === null) {
      return errors;
    }

    // 型チェック
    if (!isNumber(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName}は数値である必要があります`,
        code: 'INVALID_TYPE',
        value
      });
      return errors;
    }

    // 整数チェック
    if (integer && !Number.isInteger(value)) {
      errors.push({
        field: fieldName,
        message: `${fieldName}は整数である必要があります`,
        code: 'NOT_INTEGER',
        value
      });
    }

    // 範囲チェック
    if (min !== undefined && value < min) {
      errors.push({
        field: fieldName,
        message: `${fieldName}は${min}以上である必要があります`,
        code: 'TOO_SMALL',
        value
      });
    }

    if (max !== undefined && value > max) {
      errors.push({
        field: fieldName,
        message: `${fieldName}は${max}以下である必要があります`,
        code: 'TOO_LARGE',
        value
      });
    }

    return errors;
  }

  /**
   * XSS攻撃パターンをチェック
   */
  private static containsXSS(value: string): boolean {
    return this.XSS_PATTERNS.some(pattern => pattern.test(value));
  }

  /**
   * WindowBoundsのバリデーション
   */
  private static validateWindowBounds(
    bounds: unknown,
    fieldName: string = 'windowBounds'
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isObject(bounds)) {
      errors.push({
        field: fieldName,
        message: `${fieldName}はオブジェクトである必要があります`,
        code: 'INVALID_TYPE',
        value: bounds
      });
      return errors;
    }

    // 各プロパティのバリデーション
    errors.push(...this.validateNumber(bounds.x, `${fieldName}.x`, { required: true, integer: true }));
    errors.push(...this.validateNumber(bounds.y, `${fieldName}.y`, { required: true, integer: true }));
    errors.push(...this.validateNumber(bounds.width, `${fieldName}.width`, { 
      required: true, 
      integer: true, 
      min: this.MIN_WINDOW_SIZE, 
      max: this.MAX_WINDOW_SIZE 
    }));
    errors.push(...this.validateNumber(bounds.height, `${fieldName}.height`, { 
      required: true, 
      integer: true, 
      min: this.MIN_WINDOW_SIZE, 
      max: this.MAX_WINDOW_SIZE 
    }));

    return errors;
  }

  /**
   * CameraSettingsのバリデーション
   */
  private static validateCameraSettings(
    settings: unknown,
    fieldName: string = 'cameraSettings'
  ): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!isObject(settings)) {
      errors.push({
        field: fieldName,
        message: `${fieldName}はオブジェクトである必要があります`,
        code: 'INVALID_TYPE',
        value: settings
      });
      return errors;
    }

    // position のバリデーション
    if (settings.position) {
      if (!isObject(settings.position)) {
        errors.push({
          field: `${fieldName}.position`,
          message: 'positionはオブジェクトである必要があります',
          code: 'INVALID_TYPE',
          value: settings.position
        });
      } else {
        errors.push(...this.validateNumber(settings.position.x, `${fieldName}.position.x`, { required: true }));
        errors.push(...this.validateNumber(settings.position.y, `${fieldName}.position.y`, { required: true }));
        errors.push(...this.validateNumber(settings.position.z, `${fieldName}.position.z`, { required: true }));
      }
    }

    // target のバリデーション
    if (settings.target) {
      if (!isObject(settings.target)) {
        errors.push({
          field: `${fieldName}.target`,
          message: 'targetはオブジェクトである必要があります',
          code: 'INVALID_TYPE',
          value: settings.target
        });
      } else {
        errors.push(...this.validateNumber(settings.target.x, `${fieldName}.target.x`, { required: true }));
        errors.push(...this.validateNumber(settings.target.y, `${fieldName}.target.y`, { required: true }));
        errors.push(...this.validateNumber(settings.target.z, `${fieldName}.target.z`, { required: true }));
      }
    }

    // zoom のバリデーション
    if (settings.zoom !== undefined) {
      errors.push(...this.validateNumber(settings.zoom, `${fieldName}.zoom`, { min: 0.1, max: 10 }));
    }

    return errors;
  }

  /**
   * 設定保存リクエストのバリデーション
   */
  public static validateSaveSettingsRequest(request: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!isObject(request)) {
      errors.push({
        field: 'request',
        message: 'リクエストはオブジェクトである必要があります',
        code: 'INVALID_TYPE',
        value: request
      });
      return { isValid: false, errors, warnings };
    }

    const { settings, validateOnly } = request;

    // settings の必須チェック
    if (!isObject(settings)) {
      errors.push({
        field: 'settings',
        message: '設定オブジェクトが必要です',
        code: 'REQUIRED',
        value: settings
      });
      return { isValid: false, errors, warnings };
    }

    // validateOnly のチェック
    if (validateOnly !== undefined && !isBoolean(validateOnly)) {
      errors.push({
        field: 'validateOnly',
        message: 'validateOnlyはブール値である必要があります',
        code: 'INVALID_TYPE',
        value: validateOnly
      });
    }

    // 各設定項目のバリデーション
    if (settings.vrmModelPath !== undefined) {
      errors.push(...this.validateString(settings.vrmModelPath, 'vrmModelPath', {
        maxLength: 1000,
        pattern: /\.(vrm)$/i
      }));
    }

    if (settings.userName !== undefined) {
      errors.push(...this.validateString(settings.userName, 'userName', {
        minLength: 1,
        maxLength: 50,
        noXSS: true
      }));
    }

    if (settings.mascotName !== undefined) {
      errors.push(...this.validateString(settings.mascotName, 'mascotName', {
        minLength: 1,
        maxLength: 50,
        noXSS: true
      }));
    }

    if (settings.systemPromptCore !== undefined) {
      errors.push(...this.validateString(settings.systemPromptCore, 'systemPromptCore', {
        maxLength: this.MAX_PROMPT_LENGTH,
        noXSS: true
      }));
    }

    if (settings.theme !== undefined) {
      if (!this.VALID_THEMES.includes(settings.theme)) {
        errors.push({
          field: 'theme',
          message: `テーマは次のいずれかである必要があります: ${this.VALID_THEMES.join(', ')}`,
          code: 'INVALID_VALUE',
          value: settings.theme
        });
      }
    }

    if (settings.cameraSettings !== undefined) {
      errors.push(...this.validateCameraSettings(settings.cameraSettings));
    }

    if (settings.mainWindowBounds !== undefined) {
      errors.push(...this.validateWindowBounds(settings.mainWindowBounds, 'mainWindowBounds'));
    }

    if (settings.chatWindowBounds !== undefined) {
      errors.push(...this.validateWindowBounds(settings.chatWindowBounds, 'chatWindowBounds'));
    }

    if (settings.chatWindowVisible !== undefined && !isBoolean(settings.chatWindowVisible)) {
      errors.push({
        field: 'chatWindowVisible',
        message: 'chatWindowVisibleはブール値である必要があります',
        code: 'INVALID_TYPE',
        value: settings.chatWindowVisible
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * チャットメッセージ送信リクエストのバリデーション
   */
  public static validateSendChatMessageRequest(request: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!isObject(request)) {
      errors.push({
        field: 'request',
        message: 'リクエストはオブジェクトである必要があります',
        code: 'INVALID_TYPE',
        value: request
      });
      return { isValid: false, errors, warnings };
    }

    const { message, role, includeHistory } = request;

    // message の必須チェック
    errors.push(...this.validateString(message, 'message', {
      required: true,
      minLength: 1,
      maxLength: this.MAX_PROMPT_LENGTH,
      noXSS: true
    }));

    // role のバリデーション
    if (role !== undefined && !this.VALID_ROLES.includes(role)) {
      errors.push({
        field: 'role',
        message: `ロールは次のいずれかである必要があります: ${this.VALID_ROLES.join(', ')}`,
        code: 'INVALID_VALUE',
        value: role
      });
    }

    // includeHistory のバリデーション
    if (includeHistory !== undefined && !isBoolean(includeHistory)) {
      errors.push({
        field: 'includeHistory',
        message: 'includeHistoryはブール値である必要があります',
        code: 'INVALID_TYPE',
        value: includeHistory
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * システムプロンプト設定リクエストのバリデーション
   */
  public static validateSetSystemPromptRequest(request: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!isObject(request)) {
      errors.push({
        field: 'request',
        message: 'リクエストはオブジェクトである必要があります',
        code: 'INVALID_TYPE',
        value: request
      });
      return { isValid: false, errors, warnings };
    }

    const { prompt, core } = request;

    // prompt の必須チェック
    errors.push(...this.validateString(prompt, 'prompt', {
      required: true,
      minLength: 1,
      maxLength: this.MAX_PROMPT_LENGTH,
      noXSS: true
    }));

    // core のバリデーション
    if (core !== undefined && !isBoolean(core)) {
      errors.push({
        field: 'core',
        message: 'coreはブール値である必要があります',
        code: 'INVALID_TYPE',
        value: core
      });
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * ウィンドウ位置設定リクエストのバリデーション
   */
  public static validateSetWindowBoundsRequest(request: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!isObject(request)) {
      errors.push({
        field: 'request',
        message: 'リクエストはオブジェクトである必要があります',
        code: 'INVALID_TYPE',
        value: request
      });
      return { isValid: false, errors, warnings };
    }

    const { windowType, bounds } = request;

    // windowType のバリデーション
    if (!['main', 'chat'].includes(windowType)) {
      errors.push({
        field: 'windowType',
        message: 'windowTypeは "main" または "chat" である必要があります',
        code: 'INVALID_VALUE',
        value: windowType
      });
    }

    // bounds のバリデーション
    errors.push(...this.validateWindowBounds(bounds, 'bounds'));

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * カメラ設定リクエストのバリデーション
   */
  public static validateSetCameraSettingsRequest(request: unknown): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    if (!isObject(request)) {
      errors.push({
        field: 'request',
        message: 'リクエストはオブジェクトである必要があります',
        code: 'INVALID_TYPE',
        value: request
      });
      return { isValid: false, errors, warnings };
    }

    const { settings } = request;

    // settings の必須チェック
    if (!isObject(settings)) {
      errors.push({
        field: 'settings',
        message: 'カメラ設定オブジェクトが必要です',
        code: 'REQUIRED',
        value: settings
      });
      return { isValid: false, errors, warnings };
    }

    errors.push(...this.validateCameraSettings(settings));

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * 汎用的なバリデーション実行メソッド
   */
  public static validate(
    data: unknown,
    validatorName: keyof typeof MessageValidator
  ): ValidationResult {
    try {
      const validator = MessageValidator[validatorName] as Function;
      if (typeof validator !== 'function') {
        return {
          isValid: false,
          errors: [{
            field: 'validator',
            message: `未知のバリデーター: ${validatorName}`,
            code: 'UNKNOWN_VALIDATOR',
            value: validatorName
          }],
          warnings: []
        };
      }

      return validator(data);
    } catch (error) {
      return {
        isValid: false,
        errors: [{
          field: 'validation',
          message: `バリデーション中にエラーが発生しました: ${error instanceof Error ? error.message : '不明なエラー'}`,
          code: 'VALIDATION_ERROR',
          value: error
        }],
        warnings: []
      };
    }
  }
}