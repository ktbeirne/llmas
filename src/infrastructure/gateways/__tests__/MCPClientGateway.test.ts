import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import { MCPClientGateway } from '../MCPClientGateway';
import { 
  MCPConnectionConfig, 
  MCPConnectionError,
  MCPCommunicationError,
  MCPExecutionError,
  MCPTool,
  MCPToolResult,
  MCPCapabilities
} from '../../../domain/gateways/IMCPServiceGateway';

// Mock WebSocket
vi.mock('ws', () => {
  return {
    WebSocket: vi.fn(),
    default: vi.fn()
  };
});

describe('MCPClientGateway', () => {
  let gateway: MCPClientGateway;
  let mockWebSocket: any;
  let WebSocketMock: any;
  
  beforeEach(async () => {
    // Import the mocked module
    const wsModule = await import('ws');
    WebSocketMock = wsModule.WebSocket;
    
    gateway = new MCPClientGateway();
    
    // Setup WebSocket mock
    mockWebSocket = new EventEmitter();
    mockWebSocket.send = vi.fn();
    mockWebSocket.close = vi.fn();
    mockWebSocket.readyState = 1; // OPEN state
    
    vi.mocked(WebSocketMock).mockImplementation(() => mockWebSocket as any);
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('connect', () => {
    it('should establish WebSocket connection successfully', async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      const connectPromise = gateway.connect(config);
      
      // Simulate successful connection
      mockWebSocket.emit('open');
      
      await connectPromise;
      
      expect(WebSocketMock).toHaveBeenCalledWith('ws://localhost:8080');
      expect(gateway.isConnected()).toBe(true);
    });

    it('should handle connection error', async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      // Add error handler to prevent unhandled error
      gateway.on('error', () => {});
      
      const connectPromise = gateway.connect(config);
      
      // Wait a tick to ensure event handlers are set up
      await new Promise(resolve => process.nextTick(resolve));
      
      // Simulate connection error
      const error = { message: 'Connection refused' };
      mockWebSocket.emit('error', error);
      
      await expect(connectPromise).rejects.toThrow(MCPConnectionError);
      expect(gateway.isConnected()).toBe(false);
    });

    it('should handle authentication if provided', async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080',
        auth: {
          type: 'bearer',
          credentials: { token: 'test-token' }
        }
      };
      
      const connectPromise = gateway.connect(config);
      mockWebSocket.emit('open');
      
      await connectPromise;
      
      // Verify auth message was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"auth"')
      );
    });

    it('should reject unsupported connection types', async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'http',
        endpoint: 'http://localhost:8080'
      };
      
      await expect(gateway.connect(config)).rejects.toThrow(MCPConnectionError);
    });

    it('should handle connection timeout', async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080',
        timeout: 100 // 100ms timeout
      };
      
      const connectPromise = gateway.connect(config);
      
      // Don't emit 'open' event, let it timeout
      await expect(connectPromise).rejects.toThrow(MCPConnectionError);
      expect(gateway.isConnected()).toBe(false);
    });
  });

  describe('disconnect', () => {
    beforeEach(async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      const connectPromise = gateway.connect(config);
      mockWebSocket.emit('open');
      await connectPromise;
    });

    it('should close WebSocket connection', async () => {
      await gateway.disconnect();
      
      expect(mockWebSocket.close).toHaveBeenCalled();
      expect(gateway.isConnected()).toBe(false);
    });

    it('should handle disconnect when already disconnected', async () => {
      await gateway.disconnect();
      
      // Second disconnect should not throw
      await expect(gateway.disconnect()).resolves.not.toThrow();
    });
  });

  describe('listTools', () => {
    beforeEach(async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      const connectPromise = gateway.connect(config);
      mockWebSocket.emit('open');
      await connectPromise;
    });

    it('should retrieve list of tools', async () => {
      const mockTools: MCPTool[] = [
        {
          name: 'calculator',
          description: 'Perform calculations',
          inputSchema: {
            type: 'object',
            properties: {
              expression: { type: 'string' }
            }
          }
        }
      ];
      
      const listPromise = gateway.listTools();
      
      // Simulate server response
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      mockWebSocket.emit('message', JSON.stringify({
        id: sentMessage.id,
        type: 'listToolsResponse',
        tools: mockTools
      }));
      
      const tools = await listPromise;
      expect(tools).toEqual(mockTools);
    });

    it('should handle error response', async () => {
      const listPromise = gateway.listTools();
      
      // Simulate error response
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      mockWebSocket.emit('message', JSON.stringify({
        id: sentMessage.id,
        type: 'error',
        error: 'Failed to list tools'
      }));
      
      await expect(listPromise).rejects.toThrow(MCPCommunicationError);
    });

    it('should throw error when not connected', async () => {
      await gateway.disconnect();
      
      await expect(gateway.listTools()).rejects.toThrow(MCPConnectionError);
    });
  });

  describe('executeTool', () => {
    beforeEach(async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      const connectPromise = gateway.connect(config);
      mockWebSocket.emit('open');
      await connectPromise;
    });

    it('should execute tool successfully', async () => {
      const toolName = 'calculator';
      const args = { expression: '2 + 2' };
      
      const executePromise = gateway.executeTool(toolName, args);
      
      // Verify request was sent
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"executeTool"')
      );
      
      // Simulate successful response
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      mockWebSocket.emit('message', JSON.stringify({
        id: sentMessage.id,
        type: 'executeToolResponse',
        result: {
          success: true,
          output: { result: 4 },
          error: null,
          executionTime: 10
        }
      }));
      
      const result = await executePromise;
      expect(result.success).toBe(true);
      expect(result.output).toEqual({ result: 4 });
      expect(result.executionTime).toBe(10);
    });

    it('should handle tool execution error', async () => {
      const toolName = 'calculator';
      const args = { expression: 'invalid' };
      
      const executePromise = gateway.executeTool(toolName, args);
      
      // Simulate error response
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      mockWebSocket.emit('message', JSON.stringify({
        id: sentMessage.id,
        type: 'executeToolResponse',
        result: {
          success: false,
          output: null,
          error: 'Invalid expression',
          executionTime: 5
        }
      }));
      
      const result = await executePromise;
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid expression');
    });
  });

  describe('getCapabilities', () => {
    beforeEach(async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      const connectPromise = gateway.connect(config);
      mockWebSocket.emit('open');
      await connectPromise;
    });

    it('should retrieve server capabilities', async () => {
      const mockCapabilities: MCPCapabilities = {
        tools: true,
        streaming: false,
        authentication: ['bearer'],
        protocolVersion: '1.0',
        features: ['tools', 'batch']
      };
      
      const capabilitiesPromise = gateway.getCapabilities();
      
      // Simulate response
      const sentMessage = JSON.parse(mockWebSocket.send.mock.calls[0][0]);
      mockWebSocket.emit('message', JSON.stringify({
        id: sentMessage.id,
        type: 'capabilitiesResponse',
        capabilities: mockCapabilities
      }));
      
      const capabilities = await capabilitiesPromise;
      expect(capabilities).toEqual(mockCapabilities);
    });
  });

  describe('event handling', () => {
    it('should emit connected event', async () => {
      const handler = vi.fn();
      gateway.on('connected', handler);
      
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      const connectPromise = gateway.connect(config);
      mockWebSocket.emit('open');
      await connectPromise;
      
      expect(handler).toHaveBeenCalled();
    });

    it('should emit disconnected event', async () => {
      const handler = vi.fn();
      gateway.on('disconnected', handler);
      
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      const connectPromise = gateway.connect(config);
      mockWebSocket.emit('open');
      await connectPromise;
      
      mockWebSocket.emit('close');
      
      expect(handler).toHaveBeenCalled();
    });

    it('should emit error event', async () => {
      const handler = vi.fn();
      gateway.on('error', handler);
      
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      const connectPromise = gateway.connect(config);
      mockWebSocket.emit('open');
      await connectPromise;
      
      const error = new Error('Connection error');
      mockWebSocket.emit('error', error);
      
      expect(handler).toHaveBeenCalledWith(error);
    });

    it('should handle event unsubscription', () => {
      const handler = vi.fn();
      gateway.on('connected', handler);
      gateway.off('connected', handler);
      
      // Event should not be called after unsubscription
      gateway['eventEmitter'].emit('connected');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('getConnectionState', () => {
    it('should return disconnected state initially', () => {
      const state = gateway.getConnectionState();
      
      expect(state.connected).toBe(false);
      expect(state.connecting).toBe(false);
      expect(state.lastError).toBeNull();
      expect(state.reconnectAttempts).toBe(0);
    });

    it('should update state during connection', async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      const connectPromise = gateway.connect(config);
      
      // Check connecting state
      const connectingState = gateway.getConnectionState();
      expect(connectingState.connecting).toBe(true);
      expect(connectingState.connected).toBe(false);
      
      mockWebSocket.emit('open');
      await connectPromise;
      
      // Check connected state
      const connectedState = gateway.getConnectionState();
      expect(connectedState.connecting).toBe(false);
      expect(connectedState.connected).toBe(true);
    });

    it('should track connection errors', async () => {
      const config: MCPConnectionConfig = {
        id: 'test-server',
        type: 'websocket',
        endpoint: 'ws://localhost:8080'
      };
      
      // Add error handler to prevent unhandled error
      gateway.on('error', () => {});
      
      const connectPromise = gateway.connect(config);
      
      // Wait a tick to ensure event handlers are set up
      await new Promise(resolve => process.nextTick(resolve));
      
      const error = { message: 'Connection failed' };
      mockWebSocket.emit('error', error);
      
      try {
        await connectPromise;
      } catch {
        // Expected to fail
      }
      
      const state = gateway.getConnectionState();
      expect(state.lastError).toBeTruthy();
      // For now, just check the error exists
      expect(state.connected).toBe(false);
    });
  });
});