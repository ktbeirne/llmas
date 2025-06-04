import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  IMCPServiceGateway, 
  MCPConnectionConfig, 
  MCPTool, 
  MCPToolResult, 
  MCPCapabilities,
  MCPEvent,
  MCPConnectionState
} from '../IMCPServiceGateway';

describe('IMCPServiceGateway', () => {
  let mockGateway: IMCPServiceGateway;
  
  beforeEach(() => {
    // Create a mock implementation for testing interface contract
    mockGateway = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      listTools: vi.fn(),
      executeTool: vi.fn(),
      getCapabilities: vi.fn(),
      isConnected: vi.fn(),
      getConnectionState: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };
  });

  describe('Interface Contract', () => {
    it('should define connect method', async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080',
        timeout: 5000
      };
      
      await mockGateway.connect(config);
      expect(mockGateway.connect).toHaveBeenCalledWith(config);
    });

    it('should define disconnect method', async () => {
      await mockGateway.disconnect();
      expect(mockGateway.disconnect).toHaveBeenCalled();
    });

    it('should define listTools method', async () => {
      const mockTools: MCPTool[] = [
        {
          name: 'test_tool',
          description: 'A test tool',
          inputSchema: {
            type: 'object',
            properties: {
              input: { type: 'string' }
            }
          }
        }
      ];
      
      vi.mocked(mockGateway.listTools).mockResolvedValue(mockTools);
      const tools = await mockGateway.listTools();
      
      expect(tools).toEqual(mockTools);
      expect(mockGateway.listTools).toHaveBeenCalled();
    });

    it('should define executeTool method', async () => {
      const mockResult: MCPToolResult = {
        success: true,
        output: { result: 'test output' },
        error: null,
        executionTime: 100
      };
      
      vi.mocked(mockGateway.executeTool).mockResolvedValue(mockResult);
      const result = await mockGateway.executeTool('test_tool', { input: 'test' });
      
      expect(result).toEqual(mockResult);
      expect(mockGateway.executeTool).toHaveBeenCalledWith('test_tool', { input: 'test' });
    });

    it('should define getCapabilities method', async () => {
      const mockCapabilities: MCPCapabilities = {
        tools: true,
        streaming: false,
        authentication: ['bearer'],
        protocolVersion: '1.0',
        features: ['tools']
      };
      
      vi.mocked(mockGateway.getCapabilities).mockResolvedValue(mockCapabilities);
      const capabilities = await mockGateway.getCapabilities();
      
      expect(capabilities).toEqual(mockCapabilities);
      expect(mockGateway.getCapabilities).toHaveBeenCalled();
    });

    it('should define isConnected method', () => {
      vi.mocked(mockGateway.isConnected).mockReturnValue(true);
      const connected = mockGateway.isConnected();
      
      expect(connected).toBe(true);
      expect(mockGateway.isConnected).toHaveBeenCalled();
    });

    it('should define getConnectionState method', () => {
      const mockState: MCPConnectionState = {
        connected: true,
        connecting: false,
        lastError: null,
        reconnectAttempts: 0
      };
      
      vi.mocked(mockGateway.getConnectionState).mockReturnValue(mockState);
      const state = mockGateway.getConnectionState();
      
      expect(state).toEqual(mockState);
      expect(mockGateway.getConnectionState).toHaveBeenCalled();
    });

    it('should define event emitter methods', () => {
      const handler = vi.fn();
      
      mockGateway.on('connected', handler);
      expect(mockGateway.on).toHaveBeenCalledWith('connected', handler);
      
      mockGateway.off('connected', handler);
      expect(mockGateway.off).toHaveBeenCalledWith('connected', handler);
    });
  });

  describe('Type Definitions', () => {
    it('should properly type MCPConnectionConfig', () => {
      const websocketConfig: MCPConnectionConfig = {
        id: 'ws-server',
        type: 'websocket',
        endpoint: 'wss://secure.example.com',
        auth: {
          type: 'bearer',
          credentials: { token: 'secret' }
        },
        timeout: 10000,
        retryConfig: {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 30000,
          backoffFactor: 2
        }
      };

      const httpConfig: MCPConnectionConfig = {
        id: 'http-server',
        type: 'http',
        endpoint: 'https://api.example.com',
        auth: {
          type: 'basic',
          credentials: { username: 'user', password: 'pass' }
        }
      };

      const stdioConfig: MCPConnectionConfig = {
        id: 'stdio-server',
        type: 'stdio',
        endpoint: 'mcp-server-binary'
      };

      // Type checking - these should compile without errors
      expect(websocketConfig.type).toBe('websocket');
      expect(httpConfig.type).toBe('http');
      expect(stdioConfig.type).toBe('stdio');
    });

    it('should properly type MCPTool', () => {
      const tool: MCPTool = {
        name: 'example_tool',
        description: 'An example tool for testing',
        inputSchema: {
          type: 'object',
          properties: {
            message: { type: 'string', description: 'Input message' },
            count: { type: 'number', description: 'Repeat count' }
          },
          required: ['message']
        },
        outputSchema: {
          type: 'object',
          properties: {
            result: { type: 'string' },
            processed: { type: 'boolean' }
          }
        },
        capabilities: ['async', 'batch']
      };

      expect(tool.name).toBe('example_tool');
      expect(tool.inputSchema.properties).toBeDefined();
      expect(tool.capabilities).toContain('async');
    });

    it('should properly type MCPEvent', () => {
      const events: MCPEvent[] = [
        'connected',
        'disconnected',
        'error',
        'tool-discovered',
        'reconnecting'
      ];

      events.forEach(event => {
        expect(typeof event).toBe('string');
      });
    });
  });
});