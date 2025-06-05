/**
 * MCP Types - FSD Phase 1.3
 * Model Context Protocol機能の型定義（骨組みのみ）
 */

export interface MCPServerConfig {
  id: string;
  name: string;
  command: string;
  args?: string[];
}

export interface MCPServer {
  id: string;
  config: MCPServerConfig;
  status: 'disconnected' | 'connected';
}

export interface MCPTool {
  id: string;
  name: string;
  description?: string;
}

// 将来的な実装のためのプレースホルダー
export interface MCPState {
  servers: MCPServer[];
  tools: MCPTool[];
  
  // Actions (将来実装)
  connectServer: (serverId: string) => Promise<void>;
  disconnectServer: (serverId: string) => Promise<void>;
  executeTool: (toolId: string, params: any) => Promise<any>;
}