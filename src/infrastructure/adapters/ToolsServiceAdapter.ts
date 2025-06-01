/**
 * ToolsServiceをIToolsRepositoryインターフェースにアダプトするアダプター
 */

import { IToolsRepository } from '../../domain/repositories/ISettingsRepository';
import { ToolsService } from '../../services/toolsService';

export class ToolsServiceAdapter implements IToolsRepository {
  constructor(private toolsService: ToolsService) {}

  async getToolsConfig(): Promise<any> {
    // ToolsServiceから設定を取得
    return this.toolsService.getToolsForGemini();
  }

  async saveToolsConfig(config: any): Promise<void> {
    // ToolsServiceには設定保存機能がないため、コンソールログのみ
    console.log('ツール設定の保存:', config);
  }

  async generateDynamicTools(): Promise<any> {
    // 既存の動的ツール生成機能を利用
    // 実際の実装ではDynamicToolsGeneratorを呼び出す
    await this.toolsService.loadTools();
    return this.toolsService.getToolsForGemini();
  }

  async validateToolsConfig(config: any): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    // 基本的なバリデーション
    if (!Array.isArray(config)) {
      errors.push('ツール設定は配列である必要があります');
    } else {
      for (let i = 0; i < config.length; i++) {
        const tool = config[i];
        if (!tool.function || !tool.function.name) {
          errors.push(`ツール${i}にfunction.nameがありません`);
        }
        if (!tool.function.description) {
          errors.push(`ツール${i}にfunction.descriptionがありません`);
        }
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}