

/**
 * ファイルシステムエラー
 */
export class FileSystemError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly path?: string,
    public readonly operation?: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'FileSystemError';
  }
}

/**
 * ファイルシステムエラーコード
 */
export const FileSystemErrorCodes = {
  FILE_NOT_FOUND: 'FILE_NOT_FOUND',
  DIRECTORY_NOT_FOUND: 'DIRECTORY_NOT_FOUND',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  FILE_EXISTS: 'FILE_EXISTS',
  DIRECTORY_EXISTS: 'DIRECTORY_EXISTS',
  DISK_FULL: 'DISK_FULL',
  INVALID_PATH: 'INVALID_PATH',
  READ_ONLY: 'READ_ONLY',
  OPERATION_NOT_PERMITTED: 'OPERATION_NOT_PERMITTED',
  LOCK_FAILED: 'LOCK_FAILED',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

export type FileSystemErrorCode = typeof FileSystemErrorCodes[keyof typeof FileSystemErrorCodes];