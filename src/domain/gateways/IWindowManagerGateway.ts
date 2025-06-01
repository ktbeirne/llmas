

/**
 * ウィンドウ管理エラー
 */
export class WindowManagerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly windowId?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'WindowManagerError';
  }
}

/**
 * ウィンドウ管理エラーコード
 */
export const WindowManagerErrorCodes = {
  WINDOW_NOT_FOUND: 'WINDOW_NOT_FOUND',
  WINDOW_CREATION_FAILED: 'WINDOW_CREATION_FAILED',
  INVALID_BOUNDS: 'INVALID_BOUNDS',
  OPERATION_NOT_SUPPORTED: 'OPERATION_NOT_SUPPORTED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RESOURCE_EXHAUSTED: 'RESOURCE_EXHAUSTED',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type WindowManagerErrorCode = typeof WindowManagerErrorCodes[keyof typeof WindowManagerErrorCodes];