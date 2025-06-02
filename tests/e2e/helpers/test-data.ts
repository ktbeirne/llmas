/**
 * E2Eテストデータジェネレータ
 * 
 * 各種テストシナリオで使用するテストデータ生成ユーティリティ
 */

import path from 'path';
import { Message, CameraSettings } from './page-objects';

/**
 * ユーザー設定の型定義
 */
export interface TestUserSettings {
  userName: string;
  mascotName: string;
  theme: 'light' | 'dark' | 'auto';
  cameraSettings: CameraSettings;
  vrmFile?: string;
}

/**
 * APIレスポンスの型定義
 */
export interface MockApiResponse {
  id: string;
  content: string;
  role: 'assistant';
  timestamp: string;
  processing_time: number;
}

/**
 * パフォーマンステストデータの型定義
 */
export interface PerformanceTestData {
  expectedStartupTime: number;
  maxMemoryUsage: number;
  minFPS: number;
  maxResponseTime: number;
}

/**
 * テストデータジェネレータクラス
 */
export class TestDataGenerator {
  private static instance: TestDataGenerator;
  private testDataDir: string;

  private constructor() {
    this.testDataDir = path.join(process.cwd(), 'test-data');
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): TestDataGenerator {
    if (!TestDataGenerator.instance) {
      TestDataGenerator.instance = new TestDataGenerator();
    }
    return TestDataGenerator.instance;
  }

  /**
   * 基本的なユーザー設定データを生成
   */
  generateDefaultUserSettings(): TestUserSettings {
    return {
      userName: 'E2E Test User',
      mascotName: 'Test Mascot',
      theme: 'light',
      cameraSettings: {
        position: { x: 0, y: 0, z: 5 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1.0
      }
    };
  }

  /**
   * カスタムユーザー設定データを生成
   */
  generateCustomUserSettings(overrides: Partial<TestUserSettings>): TestUserSettings {
    const defaults = this.generateDefaultUserSettings();
    return { ...defaults, ...overrides };
  }

  /**
   * テスト用チャットメッセージを生成
   */
  generateTestMessages(count: number = 5): Message[] {
    const messages: Message[] = [];
    const baseTimestamp = Date.now();

    for (let i = 0; i < count; i++) {
      const isUser = i % 2 === 0;
      
      messages.push({
        id: `test-message-${i + 1}`,
        role: isUser ? 'user' : 'assistant',
        content: isUser 
          ? this.generateUserMessage(i + 1)
          : this.generateAssistantMessage(i + 1),
        timestamp: new Date(baseTimestamp + i * 1000).toISOString()
      });
    }

    return messages;
  }

  /**
   * テスト用ユーザーメッセージを生成
   */
  private generateUserMessage(index: number): string {
    const userMessages = [
      'こんにちは！',
      '今日の天気はどうですか？',
      'アニメーションを再生してください',
      '設定を変更したいです',
      'ありがとうございました'
    ];
    
    return userMessages[index % userMessages.length] || `テストメッセージ ${index}`;
  }

  /**
   * テスト用アシスタントメッセージを生成
   */
  private generateAssistantMessage(index: number): string {
    const assistantMessages = [
      'こんにちは！お手伝いできることがあれば何でもお聞かせください。',
      '申し訳ございませんが、リアルタイムの天気情報は取得できません。',
      'アニメーションを再生します。お楽しみください！',
      '設定画面を開きました。どの項目を変更されますか？',
      'どういたしまして！他にご質問があればお気軽にどうぞ。'
    ];
    
    return assistantMessages[index % assistantMessages.length] || `テスト応答 ${index}`;
  }

  /**
   * 長いメッセージを生成（パフォーマンステスト用）
   */
  generateLongMessage(lengthType: 'medium' | 'long' | 'very_long' = 'medium'): string {
    const baseParagraph = 'これは長いテストメッセージです。パフォーマンステストや表示テストに使用されます。';
    
    const multipliers = {
      medium: 10,   // 約500文字
      long: 50,     // 約2500文字  
      very_long: 200 // 約10000文字
    };
    
    const multiplier = multipliers[lengthType];
    return Array(multiplier).fill(baseParagraph).join(' ');
  }

  /**
   * APIモックレスポンスを生成
   */
  generateMockApiResponse(userMessage: string, delayMs: number = 1000): MockApiResponse {
    const responses = [
      'ご質問ありがとうございます。詳しく説明させていただきます。',
      'そのお気持ち、よく分かります。一緒に解決策を考えましょう。',
      '興味深いご質問ですね。いくつかの観点から考えてみましょう。',
      '申し訳ございませんが、その情報については確認が必要です。',
      '承知いたしました。ご要望に応じてサポートいたします。'
    ];
    
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    return {
      id: `mock-response-${Date.now()}`,
      content: randomResponse,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      processing_time: delayMs
    };
  }

  /**
   * VRMファイルパスを生成（テスト用ダミー）
   */
  generateVrmFilePaths(): { valid: string; invalid: string; missing: string } {
    return {
      valid: path.join(this.testDataDir, 'test-mascot.vrm'),
      invalid: path.join(this.testDataDir, 'invalid-file.txt'),
      missing: path.join(this.testDataDir, 'nonexistent.vrm')
    };
  }

  /**
   * カメラ設定のバリエーションを生成
   */
  generateCameraSettingsVariations(): CameraSettings[] {
    return [
      // デフォルト位置
      {
        position: { x: 0, y: 0, z: 5 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1.0
      },
      // 左側から
      {
        position: { x: -3, y: 0, z: 3 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1.2
      },
      // 右側から
      {
        position: { x: 3, y: 0, z: 3 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 1.2
      },
      // 上から
      {
        position: { x: 0, y: 5, z: 3 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 0.8
      },
      // 遠距離
      {
        position: { x: 0, y: 0, z: 10 },
        target: { x: 0, y: 0, z: 0 },
        zoom: 2.0
      }
    ];
  }

  /**
   * パフォーマンステストの期待値を生成
   */
  generatePerformanceExpectations(): PerformanceTestData {
    return {
      expectedStartupTime: 5000,    // 5秒以内
      maxMemoryUsage: 512 * 1024 * 1024, // 512MB
      minFPS: 30,                   // 30FPS以上
      maxResponseTime: 10000        // 10秒以内
    };
  }

  /**
   * ウィンドウサイズのバリエーションを生成
   */
  generateWindowSizeVariations(): Array<{ width: number; height: number; name: string }> {
    return [
      { width: 1920, height: 1080, name: 'Full HD' },
      { width: 1366, height: 768, name: 'HD' },
      { width: 1280, height: 720, name: 'HD Ready' },
      { width: 800, height: 600, name: 'Small' },
      { width: 2560, height: 1440, name: '2K' },
      { width: 3840, height: 2160, name: '4K' }
    ];
  }

  /**
   * エラーシナリオ用データを生成
   */
  generateErrorScenarios(): Array<{
    name: string;
    trigger: string;
    expectedError: string;
  }> {
    return [
      {
        name: 'API接続エラー',
        trigger: 'network_failure',
        expectedError: 'ネットワーク接続に失敗しました'
      },
      {
        name: 'VRMファイル読み込みエラー',
        trigger: 'invalid_vrm_file',
        expectedError: 'VRMファイルの読み込みに失敗しました'
      },
      {
        name: '設定保存エラー',
        trigger: 'settings_save_failure',
        expectedError: '設定の保存に失敗しました'
      },
      {
        name: 'メモリ不足エラー',
        trigger: 'memory_exhaustion',
        expectedError: 'メモリが不足しています'
      }
    ];
  }

  /**
   * アクセシビリティテスト用データを生成
   */
  generateAccessibilityTestData(): Array<{
    element: string;
    expectedAriaLabel: string;
    expectedRole: string;
  }> {
    return [
      {
        element: '[data-testid="chat-button"]',
        expectedAriaLabel: 'チャットを開く',
        expectedRole: 'button'
      },
      {
        element: '[data-testid="settings-button"]',
        expectedAriaLabel: '設定を開く',
        expectedRole: 'button'
      },
      {
        element: '[data-testid="message-input"]',
        expectedAriaLabel: 'メッセージを入力',
        expectedRole: 'textbox'
      },
      {
        element: '[data-testid="send-button"]',
        expectedAriaLabel: 'メッセージを送信',
        expectedRole: 'button'
      }
    ];
  }

  /**
   * ビジュアルリグレッション用スクリーンショット設定を生成
   */
  generateVisualRegressionConfig(): Array<{
    name: string;
    selector?: string;
    fullPage: boolean;
    threshold: number;
  }> {
    return [
      {
        name: 'main-window-full',
        fullPage: true,
        threshold: 0.2
      },
      {
        name: 'mascot-container',
        selector: '[data-testid="mascot-container"]',
        fullPage: false,
        threshold: 0.1
      },
      {
        name: 'chat-window-full',
        fullPage: true,
        threshold: 0.2
      },
      {
        name: 'settings-window-full',
        fullPage: true,
        threshold: 0.2
      },
      {
        name: 'speech-bubble',
        selector: '[data-testid="speech-bubble"]',
        fullPage: false,
        threshold: 0.05
      }
    ];
  }

  /**
   * テスト実行時間の推定データを生成
   */
  generateTestTimeEstimates(): Record<string, number> {
    return {
      'app-lifecycle': 30000,        // 30秒
      'window-management': 20000,    // 20秒
      'chat-conversation': 60000,    // 60秒
      'settings-flow': 40000,        // 40秒
      'vrm-loading': 45000,          // 45秒
      'performance': 120000,         // 120秒
      'visual-regression': 90000,    // 90秒
      'accessibility': 30000,        // 30秒
      'cross-platform': 300000      // 300秒
    };
  }

  /**
   * 環境固有の設定を生成
   */
  generateEnvironmentConfig(environment: 'ci' | 'development' | 'staging'): Record<string, any> {
    const baseConfig = {
      headless: environment === 'ci',
      timeout: environment === 'ci' ? 60000 : 30000,
      slowMo: environment === 'development' ? 500 : 0,
      screenshot: environment !== 'ci' ? 'only-on-failure' : 'off',
      video: environment === 'ci' ? 'retain-on-failure' : 'off'
    };

    switch (environment) {
      case 'ci':
        return {
          ...baseConfig,
          workers: 1,
          retries: 2,
          reporter: ['junit', 'json']
        };
      
      case 'development':
        return {
          ...baseConfig,
          workers: 1,
          retries: 0,
          reporter: ['list']
        };
      
      case 'staging':
        return {
          ...baseConfig,
          workers: 2,
          retries: 1,
          reporter: ['html', 'json']
        };
      
      default:
        return baseConfig;
    }
  }
}

/**
 * テストデータジェネレータのシングルトンインスタンスをエクスポート
 */
export const testDataGenerator = TestDataGenerator.getInstance();

/**
 * よく使用されるテストデータの簡易アクセス用ヘルパー関数群
 */
export const TestData = {
  // 基本データ
  defaultUser: () => testDataGenerator.generateDefaultUserSettings(),
  testMessages: (count?: number) => testDataGenerator.generateTestMessages(count),
  longMessage: (type?: 'medium' | 'long' | 'very_long') => testDataGenerator.generateLongMessage(type),
  
  // ファイルパス
  vrmFiles: () => testDataGenerator.generateVrmFilePaths(),
  
  // カメラ設定
  cameraVariations: () => testDataGenerator.generateCameraSettingsVariations(),
  
  // パフォーマンス
  performanceExpectations: () => testDataGenerator.generatePerformanceExpectations(),
  
  // ウィンドウサイズ
  windowSizes: () => testDataGenerator.generateWindowSizeVariations(),
  
  // エラーシナリオ
  errorScenarios: () => testDataGenerator.generateErrorScenarios(),
  
  // アクセシビリティ
  a11yData: () => testDataGenerator.generateAccessibilityTestData(),
  
  // ビジュアルリグレッション
  visualConfig: () => testDataGenerator.generateVisualRegressionConfig(),
  
  // 実行時間推定
  timeEstimates: () => testDataGenerator.generateTestTimeEstimates(),
  
  // 環境設定
  envConfig: (env: 'ci' | 'development' | 'staging') => testDataGenerator.generateEnvironmentConfig(env)
};