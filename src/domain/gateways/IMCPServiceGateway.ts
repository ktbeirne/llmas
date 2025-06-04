/**
 * MCP (Model Context Protocol) サービスゲートウェイインターフェース
 * MCPサーバーとの通信を抽象化し、ドメイン層での利用を可能にする
 */

/**
 * MCP接続設定
 */
export interface MCPConnectionConfig {
  /** サーバー識別子 */
  id: string;
  /** 接続タイプ */
  type: 'websocket' | 'http' | 'stdio';
  /** 接続エンドポイント (URL、パス、またはコマンド) */
  endpoint: string;
  /** 認証設定 */
  auth?: MCPAuthConfig;
  /** 接続タイムアウト (ミリ秒) */
  timeout?: number;
  /** リトライ設定 */
  retryConfig?: MCPRetryConfig;
}

/**
 * MCP認証設定
 */
export interface MCPAuthConfig {
  /** 認証タイプ */
  type: 'bearer' | 'basic' | 'custom';
  /** 認証情報 */
  credentials: any;
}

/**
 * MCPリトライ設定
 */
export interface MCPRetryConfig {
  /** 最大リトライ回数 */
  maxAttempts: number;
  /** 初回リトライ遅延 (ミリ秒) */
  initialDelay: number;
  /** 最大リトライ遅延 (ミリ秒) */
  maxDelay: number;
  /** バックオフ係数 */
  backoffFactor: number;
}

/**
 * MCPツール定義
 */
export interface MCPTool {
  /** ツール名 */
  name: string;
  /** ツールの説明 */
  description: string;
  /** 入力スキーマ (JSON Schema) */
  inputSchema: object;
  /** 出力スキーマ (JSON Schema) */
  outputSchema?: object;
  /** ツールの機能 */
  capabilities?: string[];
}

/**
 * MCPツール実行結果
 */
export interface MCPToolResult {
  /** 実行成功フラグ */
  success: boolean;
  /** 出力データ */
  output: any;
  /** エラー情報 */
  error: string | null;
  /** 実行時間 (ミリ秒) */
  executionTime: number;
}

/**
 * MCPサーバー機能
 */
export interface MCPCapabilities {
  /** ツール機能のサポート */
  tools: boolean;
  /** ストリーミングのサポート */
  streaming: boolean;
  /** サポートされる認証方式 */
  authentication: string[];
  /** プロトコルバージョン */
  protocolVersion: string;
  /** その他の機能 */
  features: string[];
}

/**
 * MCP接続状態
 */
export interface MCPConnectionState {
  /** 接続済みフラグ */
  connected: boolean;
  /** 接続中フラグ */
  connecting: boolean;
  /** 最後のエラー */
  lastError: Error | null;
  /** 再接続試行回数 */
  reconnectAttempts: number;
}

/**
 * MCPイベントタイプ
 */
export type MCPEvent = 
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'tool-discovered'
  | 'reconnecting';

/**
 * MCPサービスゲートウェイインターフェース
 */
export interface IMCPServiceGateway {
  /**
   * MCPサーバーに接続
   * @param config 接続設定
   * @throws MCPConnectionError 接続に失敗した場合
   */
  connect(config: MCPConnectionConfig): Promise<void>;

  /**
   * MCPサーバーから切断
   */
  disconnect(): Promise<void>;

  /**
   * 利用可能なツールの一覧を取得
   * @returns ツール定義の配列
   * @throws MCPCommunicationError 通信エラーが発生した場合
   */
  listTools(): Promise<MCPTool[]>;

  /**
   * ツールを実行
   * @param name ツール名
   * @param args ツール引数
   * @returns 実行結果
   * @throws MCPExecutionError 実行エラーが発生した場合
   */
  executeTool(name: string, args: any): Promise<MCPToolResult>;

  /**
   * サーバーの機能を取得
   * @returns サーバー機能情報
   */
  getCapabilities(): Promise<MCPCapabilities>;

  /**
   * 接続状態を確認
   * @returns 接続済みの場合true
   */
  isConnected(): boolean;

  /**
   * 詳細な接続状態を取得
   * @returns 接続状態情報
   */
  getConnectionState(): MCPConnectionState;

  /**
   * イベントハンドラーを登録
   * @param event イベントタイプ
   * @param handler イベントハンドラー
   */
  on(event: MCPEvent, handler: (data?: any) => void): void;

  /**
   * イベントハンドラーを解除
   * @param event イベントタイプ
   * @param handler イベントハンドラー
   */
  off(event: MCPEvent, handler: (data?: any) => void): void;
}

/**
 * MCPエラー基底クラス
 */
export class MCPError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

/**
 * MCP接続エラー
 */
export class MCPConnectionError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, 'MCP_CONNECTION_ERROR', details);
    this.name = 'MCPConnectionError';
  }
}

/**
 * MCP通信エラー
 */
export class MCPCommunicationError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, 'MCP_COMMUNICATION_ERROR', details);
    this.name = 'MCPCommunicationError';
  }
}

/**
 * MCP実行エラー
 */
export class MCPExecutionError extends MCPError {
  constructor(message: string, details?: any) {
    super(message, 'MCP_EXECUTION_ERROR', details);
    this.name = 'MCPExecutionError';
  }
}