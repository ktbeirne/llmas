/**
 * Event Types - FSD Phase 0.7 Implementation
 * アプリケーション全体のイベント型定義
 */

export interface AppEventMap {
  // マウス追従イベント
  'mouse-follow:enabled': { enabled: boolean; sensitivity: number };
  'mouse-follow:position-changed': { x: number; y: number; timestamp: number };
  'mouse-follow:settings-changed': { sensitivity: number; smoothing: number };
  
  // VRM制御イベント
  'vrm:expression-changed': { expression: string; intensity?: number };
  'vrm:animation-started': { name: string; isIdle: boolean };
  'vrm:animation-ended': { name: string };
  'vrm:model-loaded': { modelPath: string };
  'vrm:head-orientation-changed': { pitch: number; yaw: number; roll: number };
  
  // チャットイベント
  'chat:message-sent': { message: string; timestamp: number };
  'chat:message-received': { response: string; timestamp: number };
  'chat:conversation-started': { sessionId: string };
  'chat:conversation-ended': { sessionId: string };
  
  // 設定イベント
  'settings:changed': { category: string; key: string; value: any };
  'settings:saved': { category: string };
  'settings:loaded': { category: string; data: any };
  'settings:reset': { category: string };
  
  // アプリケーションイベント
  'app:ready': { version: string };
  'app:error': { error: Error; context: string };
  'app:shutdown': { reason: string };
  'app:window-focus-changed': { windowId: string; focused: boolean };
  
  // MCP統合イベント（将来用）
  'mcp:server-connected': { serverId: string; serverName: string };
  'mcp:server-disconnected': { serverId: string };
  'mcp:tool-executed': { toolId: string; result: any };
  'mcp:tool-error': { toolId: string; error: Error };
}

export type AppEvent<K extends keyof AppEventMap> = {
  type: K;
  payload: AppEventMap[K];
  timestamp: number;
};

// ユーティリティ型
export type EventHandler<K extends keyof AppEventMap> = (payload: AppEventMap[K]) => void;
export type UnsubscribeFunction = () => void;