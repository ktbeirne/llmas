/**
 * システムプロンプト構築のドメインサービス
 * プロンプトの組み立て、変数置換、テンプレート管理を担当
 */

import { UserProfile } from '../entities/UserProfile';

export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  description?: string;
}

export interface SystemPromptComponents {
  corePrompt: string;
  userContext: string;
  mascotContext: string;
  behaviorInstructions: string;
  constraints: string[];
}

/**
 * システムプロンプト構築サービス
 */
export class SystemPromptBuilder {
  private static readonly DEFAULT_CORE_PROMPT = 'あなたは親しみやすく愛らしいAIアシスタントです。ユーザーと楽しく会話してください。';
  
  private static readonly BUILT_IN_TEMPLATES: ReadonlyMap<string, PromptTemplate> = new Map([
    ['default', {
      id: 'default',
      name: 'デフォルト',
      template: '${corePrompt}\n\nユーザー名: ${userName}\nマスコット名: ${mascotName}\n\n楽しく自然な会話を心がけてください。',
      variables: ['corePrompt', 'userName', 'mascotName']
    }],
    ['friendly', {
      id: 'friendly',
      name: 'フレンドリー',
      template: 'こんにちは！私は${mascotName}です。${userName}さんとお話しできて嬉しいです！\n\n${corePrompt}\n\n親しみやすく、元気な口調で会話してください。',
      variables: ['corePrompt', 'userName', 'mascotName']
    }],
    ['professional', {
      id: 'professional',
      name: 'プロフェッショナル',
      template: '私は${mascotName}と申します。${userName}様のサポートをさせていただきます。\n\n${corePrompt}\n\n丁寧で的確な回答を心がけてください。',
      variables: ['corePrompt', 'userName', 'mascotName']
    }],
    ['casual', {
      id: 'casual',
      name: 'カジュアル',
      template: 'やあ、${userName}！${mascotName}だよ～\n\n${corePrompt}\n\nカジュアルで親近感のある会話をしようね！',
      variables: ['corePrompt', 'userName', 'mascotName']
    }]
  ]);

  private static readonly VARIABLE_PATTERN = /\$\{(\w+)\}/g;
  private static readonly MAX_PROMPT_LENGTH = 5000;
  private static readonly MIN_PROMPT_LENGTH = 10;

  /**
   * ユーザープロファイルから完全なシステムプロンプトを構築
   */
  static buildSystemPrompt(userProfile: UserProfile, templateId: string = 'default'): string {
    const template = this.getTemplate(templateId);
    const variables = this.createVariableMap(userProfile);
    
    let prompt = this.interpolateTemplate(template.template, variables);
    prompt = this.postProcessPrompt(prompt);
    
    this.validatePrompt(prompt);
    return prompt;
  }

  /**
   * プロンプト成分から完全なシステムプロンプトを構築
   */
  static buildFromComponents(components: SystemPromptComponents, userProfile: UserProfile): string {
    const sections: string[] = [];

    // コアプロンプト
    if (components.corePrompt.trim()) {
      sections.push(components.corePrompt.trim());
    }

    // ユーザーコンテキスト
    if (components.userContext.trim()) {
      sections.push(`ユーザー情報: ${components.userContext.trim()}`);
    }

    // マスコットコンテキスト
    if (components.mascotContext.trim()) {
      sections.push(`マスコット設定: ${components.mascotContext.trim()}`);
    }

    // 行動指示
    if (components.behaviorInstructions.trim()) {
      sections.push(`行動指示: ${components.behaviorInstructions.trim()}`);
    }

    // 制約条件
    if (components.constraints.length > 0) {
      const constraintText = components.constraints
        .filter(c => c.trim())
        .map(c => `- ${c.trim()}`)
        .join('\n');
      if (constraintText) {
        sections.push(`制約条件:\n${constraintText}`);
      }
    }

    // 名前情報を追加
    sections.push(`\nユーザー名: ${userProfile.userName}`);
    sections.push(`マスコット名: ${userProfile.mascotName}`);

    const prompt = sections.join('\n\n');
    const variables = this.createVariableMap(userProfile);
    const interpolated = this.interpolateTemplate(prompt, variables);
    const processed = this.postProcessPrompt(interpolated);
    
    this.validatePrompt(processed);
    return processed;
  }

  /**
   * プロンプトのプレビューを生成（変数置換後）
   */
  static previewPrompt(template: string, userProfile: UserProfile): string {
    const variables = this.createVariableMap(userProfile);
    const interpolated = this.interpolateTemplate(template, variables);
    return this.postProcessPrompt(interpolated);
  }

  /**
   * テンプレート内の変数を抽出
   */
  static extractVariables(template: string): string[] {
    const variables = new Set<string>();
    let match;
    const regex = new RegExp(this.VARIABLE_PATTERN);
    
    while ((match = regex.exec(template)) !== null) {
      variables.add(match[1]);
    }
    
    return Array.from(variables).sort();
  }

  /**
   * テンプレートの妥当性を検証
   */
  static validateTemplate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (typeof template !== 'string') {
      errors.push('テンプレートは文字列である必要があります');
      return { valid: false, errors };
    }

    if (template.trim().length === 0) {
      errors.push('テンプレートは空にできません');
    }

    if (template.length > this.MAX_PROMPT_LENGTH) {
      errors.push(`テンプレートは${this.MAX_PROMPT_LENGTH}文字以下である必要があります`);
    }

    // 危険なパターンのチェック
    if (this.containsDangerousContent(template)) {
      errors.push('テンプレートに不正な内容が含まれています');
    }

    // 無効な変数参照のチェック
    const invalidVars = this.findInvalidVariables(template);
    if (invalidVars.length > 0) {
      errors.push(`無効な変数参照: ${invalidVars.join(', ')}`);
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * 利用可能なテンプレート一覧を取得
   */
  static getAvailableTemplates(): PromptTemplate[] {
    return Array.from(this.BUILT_IN_TEMPLATES.values());
  }

  /**
   * テンプレートを取得
   */
  static getTemplate(templateId: string): PromptTemplate {
    const template = this.BUILT_IN_TEMPLATES.get(templateId);
    if (!template) {
      throw new Error(`テンプレートが見つかりません: ${templateId}`);
    }
    return template;
  }

  /**
   * カスタムテンプレートを作成
   */
  static createCustomTemplate(
    id: string,
    name: string,
    template: string,
    description?: string
  ): PromptTemplate {
    const validation = this.validateTemplate(template);
    if (!validation.valid) {
      throw new Error(`テンプレート作成エラー: ${validation.errors.join(', ')}`);
    }

    return {
      id,
      name,
      template,
      variables: this.extractVariables(template),
      description
    };
  }

  /**
   * プロンプトの統計情報を取得
   */
  static analyzePrompt(prompt: string): {
    characterCount: number;
    wordCount: number;
    lineCount: number;
    variableCount: number;
    complexity: 'low' | 'medium' | 'high';
  } {
    const characterCount = prompt.length;
    const wordCount = prompt.split(/\s+/).filter(word => word.length > 0).length;
    const lineCount = prompt.split('\n').length;
    const variableCount = this.extractVariables(prompt).length;
    
    let complexity: 'low' | 'medium' | 'high' = 'low';
    if (characterCount > 1000 || variableCount > 5) {
      complexity = 'high';
    } else if (characterCount > 500 || variableCount > 2) {
      complexity = 'medium';
    }

    return {
      characterCount,
      wordCount,
      lineCount,
      variableCount,
      complexity
    };
  }

  /**
   * 変数マップを作成
   */
  private static createVariableMap(userProfile: UserProfile): Map<string, string> {
    return new Map([
      ['userName', userProfile.userName],
      ['mascotName', userProfile.mascotName],
      ['corePrompt', userProfile.systemPromptCore],
      ['user', userProfile.userName], // 短縮版
      ['mascot', userProfile.mascotName], // 短縮版
      ['theme', userProfile.theme],
      ['defaultExpression', userProfile.defaultExpression],
      ['currentDate', new Date().toLocaleDateString('ja-JP')],
      ['currentTime', new Date().toLocaleTimeString('ja-JP')]
    ]);
  }

  /**
   * テンプレートの変数を置換
   */
  private static interpolateTemplate(template: string, variables: Map<string, string>): string {
    return template.replace(this.VARIABLE_PATTERN, (match, varName) => {
      const value = variables.get(varName);
      if (value === undefined) {
        console.warn(`Unknown variable in template: ${varName}`);
        return match; // 置換せずにそのまま残す
      }
      return value;
    });
  }

  /**
   * プロンプトの後処理
   */
  private static postProcessPrompt(prompt: string): string {
    return prompt
      .replace(/\n\s*\n\s*\n/g, '\n\n') // 3つ以上の連続改行を2つに
      .replace(/[ \t]+/g, ' ') // 複数のスペース・タブを1つのスペースに
      .replace(/^\s+|\s+$/g, '') // 先頭・末尾の空白を削除
      .replace(/([。！？])\s*([あ-ん])/g, '$1\n$2'); // 文末後の改行調整
  }

  /**
   * プロンプトの妥当性検証
   */
  private static validatePrompt(prompt: string): void {
    if (prompt.length < this.MIN_PROMPT_LENGTH) {
      throw new Error(`プロンプトが短すぎます（最小${this.MIN_PROMPT_LENGTH}文字）`);
    }

    if (prompt.length > this.MAX_PROMPT_LENGTH) {
      throw new Error(`プロンプトが長すぎます（最大${this.MAX_PROMPT_LENGTH}文字）`);
    }

    if (this.containsDangerousContent(prompt)) {
      throw new Error('プロンプトに不正な内容が含まれています');
    }
  }

  /**
   * 危険な内容のチェック
   */
  private static containsDangerousContent(content: string): boolean {
    const dangerousPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /document\s*\./gi,
      /window\s*\./gi
    ];

    return dangerousPatterns.some(pattern => pattern.test(content));
  }

  /**
   * 無効な変数参照を検出
   */
  private static findInvalidVariables(template: string): string[] {
    const validVariables = new Set([
      'userName', 'mascotName', 'corePrompt', 'user', 'mascot', 
      'theme', 'defaultExpression', 'currentDate', 'currentTime'
    ]);

    const variables = this.extractVariables(template);
    return variables.filter(varName => !validVariables.has(varName));
  }
}