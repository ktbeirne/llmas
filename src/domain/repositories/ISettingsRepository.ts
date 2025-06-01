

/**
 * 複合リポジトリインターフェース（全てのリポジトリを統合）
 */
export interface IApplicationRepository extends 
  ISettingsRepository,
  IChatHistoryRepository,
  IToolsRepository,
  IAppStateRepository {
  
  // トランザクション的な操作
  beginTransaction(): Promise<void>;
  commitTransaction(): Promise<void>;
  rollbackTransaction(): Promise<void>;
  
  // データの整合性チェック
  validateDataIntegrity(): Promise<{ valid: boolean; errors: string[] }>;
  
  // バックアップ・復元
  createBackup(): Promise<string>; // バックアップファイルパスを返す
  restoreFromBackup(backupPath: string): Promise<void>;
  
  // データベースメンテナンス
  optimizeStorage(): Promise<void>;
  getStorageUsage(): Promise<{ totalSize: number; settingsSize: number; historySize: number }>;
}