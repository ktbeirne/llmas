import * as fs from 'fs';
import * as path from 'path';

export interface SystemPromptTemplate {
  prefixTemplate: string;
  suffixTemplate: string;
  additionalInstructions: string[];
  variables?: {
    description: string;
    available: string[];
  };
}

export interface PromptVariables {
  userName: string;
  mascotName: string;
  userPrompt: string;
  [key: string]: any;
}

export class SystemPromptBuilder {
  private template: SystemPromptTemplate;
  private templatePath: string;

  constructor() {
    // 開発環境と本番環境でパスを切り替え
    const isDev = process.env.NODE_ENV === 'development';
    if (isDev) {
      this.templatePath = path.join(__dirname, '../../src/config/systemPromptTemplate.json');
    } else {
      // 本番環境ではアプリケーションリソースから読み込む
      // Electron環境でのみ利用可能
      try {
        const { app } = require('electron');
        this.templatePath = path.join(process.resourcesPath, 'config/systemPromptTemplate.json');
      } catch {
        // Electronが利用できない場合は相対パスを使用
        this.templatePath = path.join(__dirname, '../../config/systemPromptTemplate.json');
      }
    }
    
    this.template = this.loadTemplate();
  }

  /**
   * テンプレートファイルを読み込む
   */
  private loadTemplate(): SystemPromptTemplate {
    try {
      const templateContent = fs.readFileSync(this.templatePath, 'utf-8');
      return JSON.parse(templateContent);
    } catch (error) {
      console.error('[SystemPromptBuilder] テンプレートファイルの読み込みに失敗:', error);
      // デフォルトテンプレートを返す
      return this.getDefaultTemplate();
    }
  }

  /**
   * デフォルトのテンプレート
   */
  private getDefaultTemplate(): SystemPromptTemplate {
    return {
      prefixTemplate: "Your role is a desktop mascot named {{mascotName}}. You operate on the desktop of a user whose name is {{userName}}. In all following interactions, you must use the names {{mascotName}} (for yourself) and {{userName}} (for the user) correctly and appropriately.",
      suffixTemplate: "",
      additionalInstructions: []
    };
  }

  /**
   * テンプレートをリロード
   */
  public reloadTemplate(): void {
    console.log('[SystemPromptBuilder] テンプレートをリロード中...');
    this.template = this.loadTemplate();
  }

  /**
   * アプリケーションバージョンを取得
   */
  private getAppVersion(): string {
    try {
      const { app } = require('electron');
      return app.getVersion();
    } catch {
      return '1.0.0'; // デフォルトバージョン
    }
  }

  /**
   * システム変数を取得
   */
  private getSystemVariables(): Record<string, string> {
    const now = new Date();
    return {
      currentDate: now.toISOString().split('T')[0],
      currentTime: now.toTimeString().slice(0, 5),
      platform: process.platform,
      appVersion: this.getAppVersion()
    };
  }

  /**
   * テンプレート内の変数を置換
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    
    // すべての変数を置換
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, String(value));
    });
    
    return result;
  }

  /**
   * 最終的なシステムプロンプトを構築
   */
  public buildSystemPrompt(variables: PromptVariables): string {
    // システム変数とユーザー変数を結合
    const allVariables = {
      ...this.getSystemVariables(),
      ...variables
    };

    // プレフィックスを構築
    const prefix = this.replaceVariables(this.template.prefixTemplate, allVariables);
    
    // サフィックスを構築
    const suffix = this.replaceVariables(this.template.suffixTemplate, allVariables);
    
    // 追加指示を構築
    const additionalInstructions = this.template.additionalInstructions
      .map(instruction => this.replaceVariables(instruction, allVariables))
      .join('\n');

    // 最終的なプロンプトを組み立て
    const parts = [prefix];
    
    if (additionalInstructions) {
      parts.push(additionalInstructions);
    }
    
    if (variables.userPrompt) {
      parts.push(variables.userPrompt);
    }
    
    if (suffix) {
      parts.push(suffix);
    }
    
    return parts.filter(part => part.trim()).join('\n\n');
  }


  /**
   * 現在のテンプレートを取得
   */
  public getCurrentTemplate(): SystemPromptTemplate {
    return { ...this.template };
  }

  /**
   * カスタムテンプレートを設定
   */
  public setCustomTemplate(template: Partial<SystemPromptTemplate>): void {
    this.template = {
      ...this.template,
      ...template
    };
    console.log('[SystemPromptBuilder] カスタムテンプレートを設定しました');
  }
}