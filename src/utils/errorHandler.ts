import { dialog } from 'electron';

export interface AppError {
  message: string;
  code?: string;
  details?: unknown;
  timestamp: Date;
}

/**
 * エラーハンドリングのためのユーティリティクラス
 */
export class ErrorHandler {
  private static errors: AppError[] = [];

  /**
   * エラーをログに記録し、必要に応じてユーザーに通知
   */
  static handle(error: Error | unknown, showDialog = false): void {
    const appError: AppError = {
      message: error instanceof Error ? error.message : String(error),
      code: error instanceof Error && 'code' in error ? String(error.code) : undefined,
      details: error,
      timestamp: new Date(),
    };

    this.errors.push(appError);
    console.error('[ErrorHandler]', appError);

    if (showDialog) {
      dialog.showErrorBox(
        'エラーが発生しました',
        appError.message
      );
    }
  }

  /**
   * Promise拒否ハンドラ
   */
  static handleRejection(reason: unknown): void {
    this.handle(reason, false);
  }

  /**
   * 未処理のエラーハンドラ
   */
  static handleUncaughtException(error: Error): void {
    this.handle(error, true);
  }

  /**
   * エラーログを取得
   */
  static getErrors(): ReadonlyArray<AppError> {
    return [...this.errors];
  }

  /**
   * エラーログをクリア
   */
  static clearErrors(): void {
    this.errors = [];
  }
}