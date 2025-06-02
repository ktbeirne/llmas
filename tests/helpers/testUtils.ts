/**
 * テストユーティリティとヘルパー関数
 * 
 * 共通的なテスト処理を提供し、テストコードの重複を削減します。
 */

import { vi } from 'vitest';
import { resetElectronMocks, mockIpcRenderer } from '../mocks/electron';

/**
 * テストセットアップ用のヘルパー
 */
export class TestSetup {
  /**
   * 標準的なテストセットアップを実行
   * beforeEach で使用することを想定
   */
  static beforeEach(): void {
    // モックをリセット
    vi.clearAllMocks();
    resetElectronMocks();
  }
  
  /**
   * テストクリーンアップを実行
   * afterEach で使用することを想定
   */
  static afterEach(): void {
    // モックをリストア
    vi.restoreAllMocks();
  }
}

/**
 * 非同期処理のテスト用ヘルパー
 */
export class AsyncTestHelpers {
  /**
   * 指定した時間だけ待機
   * @param ms 待機時間（ミリ秒）
   */
  static async wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * 条件が満たされるまで待機
   * @param condition 待機条件を返す関数
   * @param timeout タイムアウト時間（ミリ秒）
   * @param interval チェック間隔（ミリ秒）
   */
  static async waitUntil(
    condition: () => boolean,
    timeout = 5000,
    interval = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (condition()) {
        return;
      }
      await this.wait(interval);
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
  
  /**
   * Promiseがrejectされることを確認
   * @param promise テスト対象のPromise
   * @param expectedError 期待されるエラーメッセージ（オプション）
   */
  static async expectReject(
    promise: Promise<unknown>,
    expectedError?: string
  ): Promise<void> {
    let error: Error | undefined;
    
    try {
      await promise;
    } catch (e) {
      error = e as Error;
    }
    
    if (!error) {
      throw new Error('Expected promise to reject, but it resolved');
    }
    
    if (expectedError && !error.message.includes(expectedError)) {
      throw new Error(
        `Expected error message to include "${expectedError}", but got "${error.message}"`
      );
    }
  }
}

/**
 * IPC通信のテスト用ヘルパー
 */
export class IPCTestHelpers {
  /**
   * IPC成功レスポンスを作成
   * @param data レスポンスデータ
   */
  static createSuccessResponse<T>(data?: T) {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * IPCエラーレスポンスを作成
   * @param error エラーメッセージ
   */
  static createErrorResponse(error: string) {
    return {
      success: false,
      error,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * IPC通信のモックを設定
   * @param channel IPCチャネル名
   * @param response モックレスポンス
   */
  static mockIpcInvoke(channel: string, response: unknown): void {
    mockIpcRenderer.invoke.mockImplementation((ch: string) => {
      if (ch === channel) {
        return Promise.resolve(response);
      }
      return Promise.reject(new Error(`Unexpected IPC call: ${ch}`));
    });
  }
}

/**
 * ファイルシステムのテスト用ヘルパー
 */
export class FileSystemTestHelpers {
  /**
   * 一時的なテストデータを作成
   * @param data テストデータ
   */
  static createMockFileData(data: Record<string, unknown>): string {
    return JSON.stringify(data, null, 2);
  }
  
  /**
   * ファイル読み込みのモックを設定
   * @param filePath ファイルパス
   * @param content ファイル内容
   */
  static mockFileRead(filePath: string, content: string): void {
    const fs = require('fs');
    vi.spyOn(fs, 'readFileSync').mockImplementation((path: string) => {
      if (path === filePath) {
        return content;
      }
      throw new Error(`File not found: ${path}`);
    });
  }
  
  /**
   * ファイル書き込みのモックを設定
   */
  static mockFileWrite() {
    const fs = require('fs');
    return vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
  }
}

/**
 * ウィンドウ管理のテスト用ヘルパー
 */
export class WindowTestHelpers {
  /**
   * モックウィンドウを作成
   * @param options ウィンドウオプション
   */
  static createMockWindow(options: {
    id?: number;
    title?: string;
    bounds?: { x: number; y: number; width: number; height: number };
    visible?: boolean;
    destroyed?: boolean;
  } = {}) {
    const { mockBrowserWindow } = require('../mocks/electron');
    
    const window = { ...mockBrowserWindow };
    
    if (options.id !== undefined) {
      window.id = options.id;
    }
    if (options.title !== undefined) {
      window.getTitle.mockReturnValue(options.title);
    }
    if (options.bounds !== undefined) {
      window.getBounds.mockReturnValue(options.bounds);
    }
    if (options.visible !== undefined) {
      window.isVisible.mockReturnValue(options.visible);
    }
    if (options.destroyed !== undefined) {
      window.isDestroyed.mockReturnValue(options.destroyed);
    }
    
    return window;
  }
}

/**
 * バリデーションのテスト用ヘルパー
 */
export class ValidationTestHelpers {
  /**
   * バリデーションエラーを作成
   * @param field フィールド名
   * @param message エラーメッセージ
   * @param code エラーコード
   * @param value 値
   */
  static createValidationError(
    field: string,
    message: string,
    code: string,
    value?: unknown
  ) {
    return {
      field,
      message,
      code,
      value
    };
  }
  
  /**
   * バリデーション結果を作成
   * @param isValid バリデーション結果
   * @param errors エラー一覧
   * @param warnings 警告一覧
   */
  static createValidationResult(
    isValid: boolean,
    errors: Array<{ field: string; message: string; code: string; value?: unknown }> = [],
    warnings: Array<{ field: string; message: string; code: string; value?: unknown }> = []
  ) {
    return {
      isValid,
      errors,
      warnings
    };
  }
}

/**
 * アサーション用のヘルパー
 */
export class AssertionHelpers {
  /**
   * オブジェクトが特定のプロパティを持つことを確認
   * @param obj テスト対象オブジェクト
   * @param properties 期待されるプロパティ一覧
   */
  static expectObjectToHaveProperties(
    obj: Record<string, unknown>,
    properties: string[]
  ): void {
    properties.forEach(prop => {
      if (!(prop in obj)) {
        throw new Error(`Expected object to have property "${prop}"`);
      }
    });
  }
  
  /**
   * 配列が特定の長さであることを確認
   * @param array テスト対象配列
   * @param expectedLength 期待される長さ
   */
  static expectArrayLength(array: unknown[], expectedLength: number): void {
    if (array.length !== expectedLength) {
      throw new Error(
        `Expected array length to be ${expectedLength}, but got ${array.length}`
      );
    }
  }
  
  /**
   * 関数が特定の回数呼び出されたことを確認
   * @param mockFn モック関数
   * @param expectedCalls 期待される呼び出し回数
   */
  static expectFunctionCallCount(
    mockFn: any,
    expectedCalls: number
  ): void {
    if (mockFn.mock.calls.length !== expectedCalls) {
      throw new Error(
        `Expected function to be called ${expectedCalls} times, but was called ${mockFn.mock.calls.length} times`
      );
    }
  }
}

/**
 * テストデータ生成用のヘルパー
 */
export class TestDataGenerators {
  /**
   * ランダムな文字列を生成
   * @param length 文字列の長さ
   */
  static randomString(length = 10): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  /**
   * ランダムな数値を生成
   * @param min 最小値
   * @param max 最大値
   */
  static randomNumber(min = 0, max = 100): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  /**
   * テスト用の設定データを生成
   */
  static createTestSettings() {
    return {
      userName: this.randomString(8),
      mascotName: this.randomString(8),
      theme: 'light',
      cameraSettings: {
        position: { x: 0, y: 0, z: 5 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1.0
      },
      mainWindowBounds: { 
        x: this.randomNumber(0, 500), 
        y: this.randomNumber(0, 500), 
        width: this.randomNumber(800, 1200), 
        height: this.randomNumber(600, 800) 
      },
      chatWindowVisible: Math.random() > 0.5
    };
  }
  
  /**
   * テスト用のチャットメッセージを生成
   */
  static createTestChatMessage() {
    return {
      id: this.randomString(16),
      role: Math.random() > 0.5 ? 'user' : 'assistant',
      content: `テストメッセージ: ${this.randomString(20)}`,
      timestamp: new Date().toISOString()
    };
  }
}