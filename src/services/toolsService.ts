import * as fs from 'fs';
import * as path from 'path';
import { FunctionDefinition, ToolsConfig } from '../types/tools';

/**
 * Function Callingツールの管理サービス
 */
export class ToolsService {
  private static instance: ToolsService | null = null;
  private tools: FunctionDefinition[] = [];
  private isLoaded = false;

  private constructor() {
    // プライベートコンストラクタ - シングルトンパターン
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): ToolsService {
    if (!this.instance) {
      this.instance = new ToolsService();
    }
    return this.instance;
  }

  /**
   * tools.jsonファイルを読み込み
   */
  async loadTools(): Promise<void> {
    if (this.isLoaded) {
      console.log('[ToolsService] ツールは既に読み込み済みです');
      return;
    }

    try {
      // tools.jsonのパスを解決
      const toolsPath = this.getToolsFilePath();
      console.log('[ToolsService] ツールファイルを読み込み中:', toolsPath);

      // ファイル存在確認
      if (!fs.existsSync(toolsPath)) {
        throw new Error(`ツールファイルが見つかりません: ${toolsPath}`);
      }

      // ファイル読み込みとパース
      const fileContent = fs.readFileSync(toolsPath, 'utf-8');
      const parsedTools: ToolsConfig = JSON.parse(fileContent);

      // 型検証
      this.validateToolsConfig(parsedTools);

      this.tools = parsedTools;
      this.isLoaded = true;

      console.log(`[ToolsService] ${this.tools.length}個のツールが正常に読み込まれました:`);
      this.tools.forEach(tool => {
        console.log(`  - ${tool.name}: ${tool.description}`);
      });

    } catch (error) {
      this.isLoaded = false;
      const errorMessage = `ツールの読み込みに失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`;
      console.error('[ToolsService]', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * tools.jsonファイルのパスを取得
   */
  private getToolsFilePath(): string {
    // Electronのアプリケーションパスを取得
    const { app } = require('electron');
    const appPath = app.getAppPath();
    
    // 複数の候補パスをチェック
    const candidatePaths = [
      // 開発環境用（プロジェクトルート）
      path.join(process.cwd(), 'src', 'config', 'tools.json'),
      // ビルド後の.vite/build内（ルートにコピー）
      path.join(appPath, 'tools.json'),
      // ビルド後の.vite/build内（src配下）
      path.join(appPath, 'src', 'config', 'tools.json'),
      // app.asarの場合
      path.join(appPath, '.vite', 'build', 'tools.json'),
      // リソースディレクトリ
      path.join(process.resourcesPath || appPath, 'tools.json'),
      // パッケージ後のresources内
      path.join(path.dirname(appPath), 'tools.json')
    ];
    
    console.log('[ToolsService] アプリケーションパス:', appPath);
    console.log('[ToolsService] 作業ディレクトリ:', process.cwd());
    console.log('[ToolsService] リソースパス:', process.resourcesPath);
    
    // 存在するパスを探す
    for (const candidatePath of candidatePaths) {
      console.log('[ToolsService] tools.json候補パスをチェック:', candidatePath);
      if (fs.existsSync(candidatePath)) {
        console.log('[ToolsService] tools.jsonが見つかりました:', candidatePath);
        return candidatePath;
      }
    }
    
    // 見つからない場合は最初の候補を返す（エラーで詳細表示）
    const defaultPath = candidatePaths[0];
    console.error('[ToolsService] tools.jsonが見つかりませんでした。デフォルトパス:', defaultPath);
    console.error('[ToolsService] チェックした候補パス:', candidatePaths);
    
    return defaultPath;
  }

  /**
   * ツール設定の型検証
   */
  private validateToolsConfig(config: any): asserts config is ToolsConfig {
    if (!Array.isArray(config)) {
      throw new Error('ツール設定は配列である必要があります');
    }

    config.forEach((tool: any, index: number) => {
      if (typeof tool !== 'object' || tool === null) {
        throw new Error(`ツール[${index}]: オブジェクトである必要があります`);
      }

      if (typeof tool.name !== 'string' || !tool.name.trim()) {
        throw new Error(`ツール[${index}]: nameは空でない文字列である必要があります`);
      }

      if (typeof tool.description !== 'string' || !tool.description.trim()) {
        throw new Error(`ツール[${index}]: descriptionは空でない文字列である必要があります`);
      }

      if (!tool.parameters || typeof tool.parameters !== 'object') {
        throw new Error(`ツール[${index}]: parametersは必須のオブジェクトです`);
      }

      if (tool.parameters.type !== 'object') {
        throw new Error(`ツール[${index}]: parameters.typeは'object'である必要があります`);
      }

      if (!tool.parameters.properties || typeof tool.parameters.properties !== 'object') {
        throw new Error(`ツール[${index}]: parameters.propertiesは必須のオブジェクトです`);
      }
    });
  }

  /**
   * 読み込み済みツールのリストを取得
   */
  getTools(): FunctionDefinition[] {
    if (!this.isLoaded) {
      throw new Error('ツールが読み込まれていません。先にloadTools()を呼び出してください');
    }
    return [...this.tools]; // 防御的コピー
  }

  /**
   * 指定された名前のツールを取得
   */
  getTool(name: string): FunctionDefinition | null {
    if (!this.isLoaded) {
      throw new Error('ツールが読み込まれていません。先にloadTools()を呼び出してください');
    }
    return this.tools.find(tool => tool.name === name) || null;
  }

  /**
   * @google/generative-ai用のツール形式に変換
   */
  getToolsForGemini(): any[] {
    const tools = this.getTools();
    return tools.map(tool => ({
      functionDeclarations: [{
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }]
    }));
  }

  /**
   * ツールが読み込み済みかチェック
   */
  isToolsLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * ツールを再読み込み
   */
  async reloadTools(): Promise<void> {
    this.isLoaded = false;
    this.tools = [];
    await this.loadTools();
  }
}

// 後方互換性のための関数
const toolsService = ToolsService.getInstance();

export async function loadTools(): Promise<void> {
  return toolsService.loadTools();
}

export function getTools(): FunctionDefinition[] {
  return toolsService.getTools();
}

export function getTool(name: string): FunctionDefinition | null {
  return toolsService.getTool(name);
}

export function getToolsForGemini(): any[] {
  return toolsService.getToolsForGemini();
}

export function isToolsLoaded(): boolean {
  return toolsService.isToolsLoaded();
}