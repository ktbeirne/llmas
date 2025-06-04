/**
 * MCPクライアントゲートウェイの実装
 * WebSocket、HTTP、STDIOを通じてMCPサーバーと通信
 */

import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import {
  IMCPServiceGateway,
  MCPConnectionConfig,
  MCPTool,
  MCPToolResult,
  MCPCapabilities,
  MCPConnectionState,
  MCPEvent,
  MCPConnectionError,
  MCPCommunicationError,
  MCPExecutionError
} from '../../domain/gateways/IMCPServiceGateway';

/**
 * MCPメッセージの基本型
 */
interface MCPMessage {
  id: string;
  type: string;
  [key: string]: any;
}

/**
 * ペンディングリクエストの管理
 */
interface PendingRequest {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
  timeout?: NodeJS.Timeout;
}

/**
 * MCPクライアントゲートウェイ実装
 */
export class MCPClientGateway implements IMCPServiceGateway {
  private connection: WebSocket | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private connectionState: MCPConnectionState = {
    connected: false,
    connecting: false,
    lastError: null,
    reconnectAttempts: 0
  };
  private config: MCPConnectionConfig | null = null;
  private messageIdCounter = 0;

  /**
   * MCPサーバーに接続
   */
  async connect(config: MCPConnectionConfig): Promise<void> {
    if (this.connectionState.connected) {
      throw new MCPConnectionError('Already connected to MCP server');
    }

    this.config = config;
    this.connectionState.connecting = true;
    this.connectionState.lastError = null;

    try {
      switch (config.type) {
        case 'websocket':
          await this.connectWebSocket(config);
          break;
        case 'http':
          throw new MCPConnectionError('HTTP connection type is not yet implemented');
        case 'stdio':
          throw new MCPConnectionError('STDIO connection type is not yet implemented');
        default:
          throw new MCPConnectionError(`Unsupported connection type: ${config.type}`);
      }
    } catch (error) {
      this.connectionState.connecting = false;
      this.connectionState.lastError = error as Error;
      throw error;
    }
  }

  /**
   * WebSocket接続の確立
   */
  private async connectWebSocket(config: MCPConnectionConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = config.timeout || 30000;
      let timeoutHandle: NodeJS.Timeout | undefined;

      // タイムアウト設定
      if (timeout > 0) {
        timeoutHandle = setTimeout(() => {
          if (this.connection) {
            this.connection.close();
          }
          this.connectionState.connecting = false;
          reject(new MCPConnectionError(`Connection timeout after ${timeout}ms`));
        }, timeout);
      }

      try {
        this.connection = new WebSocket(config.endpoint);

        this.connection.on('open', async () => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          
          this.connectionState.connected = true;
          this.connectionState.connecting = false;
          
          // メッセージハンドラーの設定
          this.setupMessageHandlers();
          
          // 認証が必要な場合
          if (config.auth) {
            try {
              await this.authenticate(config.auth);
            } catch (authError) {
              this.connection?.close();
              reject(authError);
              return;
            }
          }
          
          this.eventEmitter.emit('connected');
          resolve();
        });

        this.connection.on('error', (error) => {
          if (timeoutHandle) clearTimeout(timeoutHandle);
          
          this.connectionState.connecting = false;
          this.connectionState.connected = false;
          this.connectionState.lastError = error;
          
          this.eventEmitter.emit('error', error);
          reject(new MCPConnectionError(`WebSocket connection error: ${error.message}`));
        });

        this.connection.on('close', () => {
          this.handleDisconnect();
        });

      } catch (error) {
        if (timeoutHandle) clearTimeout(timeoutHandle);
        
        this.connectionState.connecting = false;
        reject(new MCPConnectionError(`Failed to create WebSocket: ${error}`));
      }
    });
  }

  /**
   * 認証処理
   */
  private async authenticate(auth: any): Promise<void> {
    const authMessage: MCPMessage = {
      id: this.generateMessageId(),
      type: 'auth',
      authType: auth.type,
      credentials: auth.credentials
    };

    await this.sendMessage(authMessage);
  }

  /**
   * メッセージハンドラーの設定
   */
  private setupMessageHandlers(): void {
    if (!this.connection) return;

    this.connection.on('message', (data: Buffer | string) => {
      try {
        const message: MCPMessage = JSON.parse(data.toString());
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse MCP message:', error);
        this.eventEmitter.emit('error', new MCPCommunicationError('Invalid message format'));
      }
    });
  }

  /**
   * メッセージの処理
   */
  private handleMessage(message: MCPMessage): void {
    // リクエストへの応答の場合
    if (message.id && this.pendingRequests.has(message.id)) {
      const pending = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);
      
      if (pending.timeout) clearTimeout(pending.timeout);

      if (message.type === 'error') {
        pending.reject(new MCPCommunicationError(message.error || 'Server error'));
      } else {
        pending.resolve(message);
      }
      return;
    }

    // サーバーからの通知
    switch (message.type) {
      case 'toolDiscovered':
        this.eventEmitter.emit('tool-discovered', message.tool);
        break;
      default:
        console.warn('Unhandled message type:', message.type);
    }
  }

  /**
   * 切断処理
   */
  private handleDisconnect(): void {
    this.connectionState.connected = false;
    this.connectionState.connecting = false;
    
    // ペンディングリクエストをすべてエラーで終了
    this.pendingRequests.forEach((pending) => {
      if (pending.timeout) clearTimeout(pending.timeout);
      pending.reject(new MCPConnectionError('Connection closed'));
    });
    this.pendingRequests.clear();
    
    this.eventEmitter.emit('disconnected');
  }

  /**
   * MCPサーバーから切断
   */
  async disconnect(): Promise<void> {
    if (!this.connection || !this.connectionState.connected) {
      return; // Already disconnected
    }

    this.connection.close();
    this.connection = null;
    this.handleDisconnect();
  }

  /**
   * 利用可能なツールの一覧を取得
   */
  async listTools(): Promise<MCPTool[]> {
    this.ensureConnected();

    const response = await this.sendRequest({
      type: 'listTools'
    });

    if (response.type !== 'listToolsResponse') {
      throw new MCPCommunicationError('Unexpected response type');
    }

    return response.tools || [];
  }

  /**
   * ツールを実行
   */
  async executeTool(name: string, args: any): Promise<MCPToolResult> {
    this.ensureConnected();

    const response = await this.sendRequest({
      type: 'executeTool',
      name,
      args
    });

    if (response.type !== 'executeToolResponse') {
      throw new MCPCommunicationError('Unexpected response type');
    }

    return response.result;
  }

  /**
   * サーバーの機能を取得
   */
  async getCapabilities(): Promise<MCPCapabilities> {
    this.ensureConnected();

    const response = await this.sendRequest({
      type: 'getCapabilities'
    });

    if (response.type !== 'capabilitiesResponse') {
      throw new MCPCommunicationError('Unexpected response type');
    }

    return response.capabilities;
  }

  /**
   * 接続状態を確認
   */
  isConnected(): boolean {
    return this.connectionState.connected;
  }

  /**
   * 詳細な接続状態を取得
   */
  getConnectionState(): MCPConnectionState {
    return { ...this.connectionState };
  }

  /**
   * イベントハンドラーを登録
   */
  on(event: MCPEvent, handler: (data?: any) => void): void {
    this.eventEmitter.on(event, handler);
  }

  /**
   * イベントハンドラーを解除
   */
  off(event: MCPEvent, handler: (data?: any) => void): void {
    this.eventEmitter.off(event, handler);
  }

  /**
   * 接続確認
   */
  private ensureConnected(): void {
    if (!this.connectionState.connected) {
      throw new MCPConnectionError('Not connected to MCP server');
    }
  }

  /**
   * リクエストの送信
   */
  private async sendRequest(request: Omit<MCPMessage, 'id'>, timeout = 30000): Promise<MCPMessage> {
    const id = this.generateMessageId();
    const message: MCPMessage = {
      id,
      type: request.type,
      ...request
    };

    return new Promise((resolve, reject) => {
      const pending: PendingRequest = {
        resolve,
        reject,
        timeout: setTimeout(() => {
          this.pendingRequests.delete(id);
          reject(new MCPCommunicationError('Request timeout'));
        }, timeout)
      };

      this.pendingRequests.set(id, pending);

      try {
        this.sendMessage(message);
      } catch (error) {
        this.pendingRequests.delete(id);
        if (pending.timeout) clearTimeout(pending.timeout);
        reject(error);
      }
    });
  }

  /**
   * メッセージの送信
   */
  private sendMessage(message: MCPMessage): void {
    if (!this.connection || this.connection.readyState !== 1) { // WebSocket.OPEN = 1
      throw new MCPConnectionError('WebSocket is not connected');
    }

    try {
      this.connection.send(JSON.stringify(message));
    } catch (error) {
      throw new MCPCommunicationError(`Failed to send message: ${error}`);
    }
  }

  /**
   * メッセージIDの生成
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${++this.messageIdCounter}`;
  }
}