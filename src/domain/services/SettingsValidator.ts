/**
 * 設定値検証のドメインサービス
 * 全ての設定項目に対する検証ルールを一元化
 */

import { UserProfile } from '../entities/UserProfile';
import { CameraSettings, Vector3D } from '../entities/CameraSettings';
import { ExpressionSettings } from '../entities/ExpressionSettings';
import { WindowBounds } from '../value-objects/WindowBounds';
import { WindowSettings } from '../entities/WindowSettings';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface SettingsValidationReport {
  userProfile: ValidationResult;
  cameraSettings: ValidationResult;
  expressionSettings: ValidationResult;
  windowSettings: ValidationResult;
  vrmModelPath: ValidationResult;
  overall: ValidationResult;
}

/**
 * 設定値検証サービス
 */
export class SettingsValidator {
  private static readonly VRM_FILE_EXTENSIONS = ['.vrm'];
  private static readonly MAX_PATH_LENGTH = 1000;
  private static readonly MIN_WINDOW_WIDTH = 200;
  private static readonly MAX_WINDOW_WIDTH = 1000;
  private static readonly MIN_WINDOW_HEIGHT = 300;
  private static readonly MAX_WINDOW_HEIGHT = 1200;
  private static readonly MIN_CHAT_WINDOW_SIZE = 200;
  private static readonly SAFE_ZONE_MARGIN = 50; // 画面端からの安全マージン

  /**
   * VRMモデルパスの検証
   */
  static validateVrmModelPath(path: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof path !== 'string') {
      errors.push('VRMモデルパスは文字列である必要があります');
      return { valid: false, errors, warnings };
    }

    const trimmedPath = path.trim();
    if (trimmedPath.length === 0) {
      errors.push('VRMモデルパスは空にできません');
    }

    if (trimmedPath.length > this.MAX_PATH_LENGTH) {
      errors.push(`VRMモデルパスは${this.MAX_PATH_LENGTH}文字以下である必要があります`);
    }

    // 拡張子チェック
    const hasValidExtension = this.VRM_FILE_EXTENSIONS.some(ext => 
      trimmedPath.toLowerCase().endsWith(ext)
    );
    if (!hasValidExtension) {
      errors.push(`VRMファイルは${this.VRM_FILE_EXTENSIONS.join(', ')}の拡張子を持つ必要があります`);
    }

    // パス形式の基本チェック
    if (this.containsInvalidPathCharacters(trimmedPath)) {
      errors.push('VRMモデルパスに不正な文字が含まれています');
    }

    // 相対パスの警告
    if (!trimmedPath.startsWith('/') && !trimmedPath.match(/^[a-zA-Z]:/)) {
      warnings.push('相対パスが指定されています。絶対パスの使用を推奨します');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * ウィンドウサイズ設定の検証
   */
  static validateWindowSize(width: number, height: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 数値型チェック
    if (typeof width !== 'number' || !isFinite(width)) {
      errors.push(`ウィンドウ幅は有効な数値である必要があります: ${width}`);
    }
    if (typeof height !== 'number' || !isFinite(height)) {
      errors.push(`ウィンドウ高さは有効な数値である必要があります: ${height}`);
    }

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // 範囲チェック
    if (width < this.MIN_WINDOW_WIDTH || width > this.MAX_WINDOW_WIDTH) {
      errors.push(`ウィンドウ幅は${this.MIN_WINDOW_WIDTH}以上${this.MAX_WINDOW_WIDTH}以下である必要があります: ${width}`);
    }

    if (height < this.MIN_WINDOW_HEIGHT || height > this.MAX_WINDOW_HEIGHT) {
      errors.push(`ウィンドウ高さは${this.MIN_WINDOW_HEIGHT}以上${this.MAX_WINDOW_HEIGHT}以下である必要があります: ${height}`);
    }

    // アスペクト比チェック
    const aspectRatio = width / height;
    if (aspectRatio < 0.3 || aspectRatio > 3.0) {
      warnings.push(`アスペクト比が極端です（${aspectRatio.toFixed(2)}）。使用性に影響する可能性があります`);
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * ウィンドウ境界の検証
   */
  static validateWindowBounds(
    bounds: { x: number; y: number; width: number; height: number },
    isMainWindow: boolean = true
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 数値型チェック
    const values = [bounds.x, bounds.y, bounds.width, bounds.height];
    const names = ['x', 'y', 'width', 'height'];
    
    values.forEach((value, index) => {
      if (typeof value !== 'number' || !isFinite(value)) {
        errors.push(`${names[index]}は有効な数値である必要があります: ${value}`);
      }
    });

    if (errors.length > 0) {
      return { valid: false, errors, warnings };
    }

    // サイズ検証
    const minSize = isMainWindow ? this.MIN_WINDOW_HEIGHT : this.MIN_CHAT_WINDOW_SIZE;
    if (bounds.width < this.MIN_WINDOW_WIDTH) {
      errors.push(`ウィンドウ幅は${this.MIN_WINDOW_WIDTH}以上である必要があります: ${bounds.width}`);
    }
    if (bounds.height < minSize) {
      errors.push(`ウィンドウ高さは${minSize}以上である必要があります: ${bounds.height}`);
    }

    // 画面外配置の警告
    if (bounds.x < -bounds.width + this.SAFE_ZONE_MARGIN || 
        bounds.y < -bounds.height + this.SAFE_ZONE_MARGIN) {
      warnings.push('ウィンドウが画面外に配置される可能性があります');
    }

    // 極端に大きなサイズの警告
    if (bounds.width > 2000 || bounds.height > 1500) {
      warnings.push('ウィンドウサイズが非常に大きく設定されています');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * チャットウィンドウ表示状態の検証
   */
  static validateChatWindowVisible(visible: boolean): ValidationResult {
    const errors: string[] = [];

    if (typeof visible !== 'boolean') {
      errors.push('チャットウィンドウ表示状態はboolean値である必要があります');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * システムプロンプトの検証
   */
  static validateSystemPrompt(prompt: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof prompt !== 'string') {
      errors.push('システムプロンプトは文字列である必要があります');
      return { valid: false, errors };
    }

    const trimmedPrompt = prompt.trim();
    if (trimmedPrompt.length === 0) {
      errors.push('システムプロンプトは空にできません');
    }

    if (trimmedPrompt.length > 5000) {
      errors.push('システムプロンプトは5000文字以下である必要があります');
    }

    // 危険なコンテンツのチェック
    if (this.containsDangerousContent(trimmedPrompt)) {
      errors.push('システムプロンプトに不正な内容が含まれています');
    }

    // 長さに関する警告
    if (trimmedPrompt.length > 2000) {
      warnings.push('システムプロンプトが長すぎる可能性があります。応答品質に影響する場合があります');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * テーマ名の検証
   */
  static validateTheme(theme: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof theme !== 'string') {
      errors.push('テーマ名は文字列である必要があります');
      return { valid: false, errors };
    }

    const trimmedTheme = theme.trim();
    if (trimmedTheme.length === 0) {
      errors.push('テーマ名は空にできません');
    }

    if (trimmedTheme.length > 100) {
      errors.push('テーマ名は100文字以下である必要があります');
    }

    // 基本的な文字のみ許可
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedTheme)) {
      errors.push('テーマ名には英数字、アンダースコア、ハイフンのみ使用できます');
    }

    // 予約語チェック
    const reservedWords = ['default', 'system', 'admin', 'root', 'config'];
    if (reservedWords.includes(trimmedTheme.toLowerCase())) {
      warnings.push('予約語に近いテーマ名です。混乱を避けるため別の名前を推奨します');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * デフォルト表情名の検証
   */
  static validateDefaultExpression(expression: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (typeof expression !== 'string') {
      errors.push('デフォルト表情名は文字列である必要があります');
      return { valid: false, errors };
    }

    const trimmedExpression = expression.trim();
    if (trimmedExpression.length === 0) {
      errors.push('デフォルト表情名は空にできません');
    }

    if (trimmedExpression.length > 100) {
      errors.push('デフォルト表情名は100文字以下である必要があります');
    }

    // 表情名として適切な文字のみ許可
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedExpression)) {
      errors.push('デフォルト表情名には英数字、アンダースコア、ハイフンのみ使用できます');
    }

    // 一般的な表情名の推奨
    const commonExpressions = [
      'neutral', 'happy', 'sad', 'angry', 'surprised', 'relaxed',
      'fun', 'joy', 'sorrow', 'blink', 'aa', 'ih', 'ou', 'ee', 'oh'
    ];
    if (!commonExpressions.includes(trimmedExpression.toLowerCase())) {
      warnings.push('一般的でない表情名です。VRMモデルでサポートされているか確認してください');
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 全設定の包括的検証
   */
  static validateAllSettings(settings: {
    userProfile?: UserProfile;
    cameraSettings?: CameraSettings;
    expressionSettings?: ExpressionSettings;
    windowSettings?: WindowSettings;
    vrmModelPath?: string;
    mainWindowBounds?: WindowBounds;
    chatWindowBounds?: WindowBounds;
    chatWindowVisible?: boolean;
    systemPrompt?: string;
    theme?: string;
    defaultExpression?: string;
  }): SettingsValidationReport {
    const report: SettingsValidationReport = {
      userProfile: { valid: true, errors: [] },
      cameraSettings: { valid: true, errors: [] },
      expressionSettings: { valid: true, errors: [] },
      windowSettings: { valid: true, errors: [] },
      vrmModelPath: { valid: true, errors: [] },
      overall: { valid: true, errors: [] }
    };

    const allErrors: string[] = [];
    const allWarnings: string[] = [];

    // ユーザープロファイル検証
    if (settings.userProfile) {
      try {
        // UserProfile エンティティは内部で検証済み
        report.userProfile = { valid: true, errors: [] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        report.userProfile = { valid: false, errors: [errorMessage] };
        allErrors.push(`ユーザープロファイル: ${errorMessage}`);
      }
    }

    // カメラ設定検証
    if (settings.cameraSettings) {
      try {
        // CameraSettings エンティティは内部で検証済み
        report.cameraSettings = { valid: true, errors: [] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        report.cameraSettings = { valid: false, errors: [errorMessage] };
        allErrors.push(`カメラ設定: ${errorMessage}`);
      }
    }

    // 表情設定検証
    if (settings.expressionSettings) {
      try {
        // ExpressionSettings エンティティは内部で検証済み
        report.expressionSettings = { valid: true, errors: [] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        report.expressionSettings = { valid: false, errors: [errorMessage] };
        allErrors.push(`表情設定: ${errorMessage}`);
      }
    }

    // ウィンドウ設定検証
    if (settings.windowSettings) {
      try {
        // WindowSettings エンティティは内部で検証済み
        report.windowSettings = { valid: true, errors: [] };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラー';
        report.windowSettings = { valid: false, errors: [errorMessage] };
        allErrors.push(`ウィンドウ設定: ${errorMessage}`);
      }
    }

    // VRMモデルパス検証
    if (settings.vrmModelPath) {
      report.vrmModelPath = this.validateVrmModelPath(settings.vrmModelPath);
      if (!report.vrmModelPath.valid) {
        allErrors.push(...report.vrmModelPath.errors.map(e => `VRMモデルパス: ${e}`));
      }
      if (report.vrmModelPath.warnings) {
        allWarnings.push(...report.vrmModelPath.warnings.map(w => `VRMモデルパス: ${w}`));
      }
    }

    // 個別項目の検証
    if (settings.systemPrompt) {
      const result = this.validateSystemPrompt(settings.systemPrompt);
      if (!result.valid) {
        allErrors.push(...result.errors.map(e => `システムプロンプト: ${e}`));
      }
      if (result.warnings) {
        allWarnings.push(...result.warnings.map(w => `システムプロンプト: ${w}`));
      }
    }

    if (settings.theme) {
      const result = this.validateTheme(settings.theme);
      if (!result.valid) {
        allErrors.push(...result.errors.map(e => `テーマ: ${e}`));
      }
      if (result.warnings) {
        allWarnings.push(...result.warnings.map(w => `テーマ: ${w}`));
      }
    }

    if (settings.defaultExpression) {
      const result = this.validateDefaultExpression(settings.defaultExpression);
      if (!result.valid) {
        allErrors.push(...result.errors.map(e => `デフォルト表情: ${e}`));
      }
      if (result.warnings) {
        allWarnings.push(...result.warnings.map(w => `デフォルト表情: ${w}`));
      }
    }

    // ウィンドウ境界の検証
    if (settings.mainWindowBounds) {
      const bounds = settings.mainWindowBounds;
      const result = this.validateWindowBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      }, true);
      if (!result.valid) {
        allErrors.push(...result.errors.map(e => `メインウィンドウ境界: ${e}`));
      }
      if (result.warnings) {
        allWarnings.push(...result.warnings.map(w => `メインウィンドウ境界: ${w}`));
      }
    }

    if (settings.chatWindowBounds) {
      const bounds = settings.chatWindowBounds;
      const result = this.validateWindowBounds({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height
      }, false);
      if (!result.valid) {
        allErrors.push(...result.errors.map(e => `チャットウィンドウ境界: ${e}`));
      }
      if (result.warnings) {
        allWarnings.push(...result.warnings.map(w => `チャットウィンドウ境界: ${w}`));
      }
    }

    if (settings.chatWindowVisible !== undefined) {
      const result = this.validateChatWindowVisible(settings.chatWindowVisible);
      if (!result.valid) {
        allErrors.push(...result.errors.map(e => `チャットウィンドウ表示状態: ${e}`));
      }
    }

    // 全体結果の設定
    report.overall = {
      valid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings.length > 0 ? allWarnings : undefined
    };

    return report;
  }

  /**
   * 設定の互換性チェック
   */
  static validateCompatibility(settings: {
    expressionSettings?: ExpressionSettings;
    defaultExpression?: string;
    userProfile?: UserProfile;
  }): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // デフォルト表情と表情設定の整合性チェック
    if (settings.expressionSettings && settings.defaultExpression) {
      if (!settings.expressionSettings.hasExpression(settings.defaultExpression)) {
        errors.push(`デフォルト表情「${settings.defaultExpression}」が表情設定に含まれていません`);
      } else if (settings.expressionSettings.isDisabled(settings.defaultExpression)) {
        warnings.push(`デフォルト表情「${settings.defaultExpression}」が無効になっています`);
      }
    }

    // ユーザープロファイルとその他設定の整合性チェック
    if (settings.userProfile && settings.defaultExpression) {
      if (settings.userProfile.defaultExpression !== settings.defaultExpression) {
        warnings.push('ユーザープロファイルのデフォルト表情と設定のデフォルト表情が一致しません');
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * 設定値のサニタイズ
   */
  static sanitizeSettings(settings: {
    userName?: string;
    mascotName?: string;
    systemPrompt?: string;
    theme?: string;
    defaultExpression?: string;
    vrmModelPath?: string;
  }): typeof settings {
    const sanitized = { ...settings };

    if (sanitized.userName) {
      sanitized.userName = sanitized.userName.trim().slice(0, 50);
    }
    if (sanitized.mascotName) {
      sanitized.mascotName = sanitized.mascotName.trim().slice(0, 50);
    }
    if (sanitized.systemPrompt) {
      sanitized.systemPrompt = sanitized.systemPrompt.trim().slice(0, 5000);
    }
    if (sanitized.theme) {
      sanitized.theme = sanitized.theme.trim().toLowerCase().slice(0, 100);
    }
    if (sanitized.defaultExpression) {
      sanitized.defaultExpression = sanitized.defaultExpression.trim().toLowerCase().slice(0, 100);
    }
    if (sanitized.vrmModelPath) {
      sanitized.vrmModelPath = sanitized.vrmModelPath.trim().slice(0, 1000);
    }

    return sanitized;
  }

  /**
   * 不正なパス文字の検出
   */
  private static containsInvalidPathCharacters(path: string): boolean {
    // Windows/Unix共通で無効な文字
    const invalidChars = /[<>:"|?*\x00-\x1f]/;
    return invalidChars.test(path);
  }

  /**
   * 危険なコンテンツの検出
   */
  private static containsDangerousContent(content: string): boolean {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /document\s*\./gi,
      /window\s*\./gi,
      /process\s*\./gi,
      /require\s*\(/gi,
      /import\s*\(/gi
    ];

    return dangerousPatterns.some(pattern => pattern.test(content));
  }
}