/**
 * MCP Store - FSD Phase 1.3
 * Model Context Protocolの状態管理（FSDパターン確立用の骨組み）
 */

import { create } from 'zustand';
import { eventBus } from '@shared/lib/app-event-bus';
import { MCPServer, MCPServerConfig, MCPTool } from '../types';

interface MCPStoreState {
  // State
  servers: MCPServer[];
  tools: MCPTool[];
  
  // Actions
  addServer: (config: MCPServerConfig) => void;
  removeServer: (serverId: string) => void;
  
  // 将来の実装のプレースホルダー
  connectServer: (serverId: string) => Promise<void>;
  disconnectServer: (serverId: string) => Promise<void>;
  executeTool: (toolId: string, params: any) => Promise<any>;
}

export const useMCPStore = create<MCPStoreState>((set, get) => ({
  // Initial state
  servers: [],
  tools: [],
  
  // Actions
  addServer: (config) => {
    const newServer: MCPServer = {
      id: config.id,
      config,
      status: 'disconnected'
    };
    
    set((state) => ({
      servers: [...state.servers, newServer]
    }));
    
    // イベント発火（FSDパターンの例示）
    eventBus.emit('settings:changed', {
      category: 'mcp',
      key: 'server-added',
      value: config
    });
  },
  
  removeServer: (serverId) => {
    set((state) => ({
      servers: state.servers.filter(s => s.id !== serverId)
    }));
    
    eventBus.emit('settings:changed', {
      category: 'mcp',
      key: 'server-removed',
      value: serverId
    });
  },
  
  // 将来の実装のプレースホルダー（FSDパターンの例示）
  connectServer: async (serverId) => {
    // TODO: 実際のMCP接続実装
    console.log(`MCP: Connecting to server ${serverId} (not implemented)`);
    
    eventBus.emit('mcp:server-connected', { serverId });
  },
  
  disconnectServer: async (serverId) => {
    // TODO: 実際のMCP切断実装
    console.log(`MCP: Disconnecting from server ${serverId} (not implemented)`);
    
    eventBus.emit('mcp:server-disconnected', { serverId });
  },
  
  executeTool: async (toolId, params) => {
    // TODO: 実際のツール実行実装
    console.log(`MCP: Executing tool ${toolId} (not implemented)`, params);
    
    eventBus.emit('mcp:tool-executed', { toolId, params });
    
    // ダミーの結果を返す
    return { success: true, result: 'Not implemented' };
  }
}));