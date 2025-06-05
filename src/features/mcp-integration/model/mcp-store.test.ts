/**
 * MCP Store Tests - FSD Phase 1.3
 * MCPストアの基本動作確認（FSDパターン確立用）
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { useMCPStore } from './mcp-store';

describe('MCP Store (FSD Pattern)', () => {
  beforeEach(() => {
    // ストアをリセット
    useMCPStore.setState({
      servers: [],
      tools: []
    });
  });

  describe('基本的な状態管理', () => {
    it('should have initial state', () => {
      const state = useMCPStore.getState();
      
      expect(state.servers).toEqual([]);
      expect(state.tools).toEqual([]);
    });

    it('should add server configuration', () => {
      const { addServer } = useMCPStore.getState();
      
      const config = {
        id: 'test-server',
        name: 'Test Server',
        command: 'test-command'
      };
      
      addServer(config);
      
      const state = useMCPStore.getState();
      expect(state.servers).toHaveLength(1);
      expect(state.servers[0]).toMatchObject({
        id: 'test-server',
        config,
        status: 'disconnected'
      });
    });

    it('should remove server configuration', () => {
      const { addServer, removeServer } = useMCPStore.getState();
      
      addServer({
        id: 'server-1',
        name: 'Server 1',
        command: 'cmd1'
      });
      
      addServer({
        id: 'server-2',
        name: 'Server 2',
        command: 'cmd2'
      });
      
      removeServer('server-1');
      
      const state = useMCPStore.getState();
      expect(state.servers).toHaveLength(1);
      expect(state.servers[0].id).toBe('server-2');
    });
  });

  describe('将来の実装のプレースホルダー', () => {
    it('should have connect/disconnect methods', () => {
      const { connectServer, disconnectServer } = useMCPStore.getState();
      
      expect(typeof connectServer).toBe('function');
      expect(typeof disconnectServer).toBe('function');
    });

    it('should have executeTool method', () => {
      const { executeTool } = useMCPStore.getState();
      
      expect(typeof executeTool).toBe('function');
    });
  });
});