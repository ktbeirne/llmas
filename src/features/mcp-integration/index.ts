/**
 * MCP Integration Feature - FSD Phase 1.3
 * Public API - 他のFeatureやWidgetから利用可能なエクスポート
 */

// Store
export { useMCPStore } from './model/mcp-store';

// Types
export type {
  MCPServer,
  MCPServerConfig,
  MCPTool,
  MCPState
} from './types';

// 将来的なUIコンポーネントのエクスポート例
// export { MCPServerList } from './ui/MCPServerList';
// export { MCPToolPanel } from './ui/MCPToolPanel';

// 将来的なユーティリティのエクスポート例
// export { validateServerConfig } from './lib/validators';
// export { MCPProtocolAdapter } from './lib/protocol-adapter';