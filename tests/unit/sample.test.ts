/**
 * サンプル単体テスト
 * 
 * 単体テストの書き方を示すサンプルです。
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TestSetup, TestDataGenerators } from '@tests/helpers';

describe('サンプル単体テスト', () => {
  beforeEach(() => {
    TestSetup.beforeEach();
  });

  describe('基本的なテスト', () => {
    it('should perform basic assertions', () => {
      const result = 2 + 2;
      expect(result).toBe(4);
      expect(result).toBeGreaterThan(3);
      expect(result).toBeLessThan(5);
    });

    it('should test string operations', () => {
      const str = 'Hello World';
      expect(str).toContain('Hello');
      expect(str).toHaveLength(11);
      expect(str.toLowerCase()).toBe('hello world');
    });

    it('should test array operations', () => {
      const arr = [1, 2, 3, 4, 5];
      expect(arr).toHaveLength(5);
      expect(arr).toContain(3);
      expect(arr[0]).toBe(1);
      expect(arr[arr.length - 1]).toBe(5);
    });

    it('should test object properties', () => {
      const obj = { name: 'Test', value: 42, active: true };
      expect(obj).toHaveProperty('name');
      expect(obj).toHaveProperty('value', 42);
      expect(obj.active).toBe(true);
    });
  });

  describe('非同期処理のテスト', () => {
    it('should test async operations', async () => {
      const asyncFunc = async () => {
        return new Promise<string>(resolve => {
          setTimeout(() => resolve('async result'), 100);
        });
      };

      const result = await asyncFunc();
      expect(result).toBe('async result');
    });

    it('should test promise rejection', async () => {
      const rejectFunc = async () => {
        throw new Error('Test error');
      };

      await expect(rejectFunc()).rejects.toThrow('Test error');
    });
  });

  describe('テストデータ生成', () => {
    it('should generate random test data', () => {
      const randomStr = TestDataGenerators.randomString(10);
      expect(randomStr).toHaveLength(10);
      expect(typeof randomStr).toBe('string');

      const randomNum = TestDataGenerators.randomNumber(1, 100);
      expect(randomNum).toBeGreaterThanOrEqual(1);
      expect(randomNum).toBeLessThanOrEqual(100);
    });

    it('should generate test settings', () => {
      const settings = TestDataGenerators.createTestSettings();
      
      expect(settings).toHaveProperty('userName');
      expect(settings).toHaveProperty('mascotName');
      expect(settings).toHaveProperty('theme');
      expect(settings).toHaveProperty('cameraSettings');
      expect(settings).toHaveProperty('mainWindowBounds');
      expect(settings).toHaveProperty('chatWindowVisible');
      
      expect(typeof settings.userName).toBe('string');
      expect(typeof settings.mascotName).toBe('string');
      expect(settings.theme).toBe('light');
      expect(typeof settings.chatWindowVisible).toBe('boolean');
    });

    it('should generate test chat messages', () => {
      const message = TestDataGenerators.createTestChatMessage();
      
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('role');
      expect(message).toHaveProperty('content');
      expect(message).toHaveProperty('timestamp');
      
      expect(['user', 'assistant']).toContain(message.role);
      expect(typeof message.content).toBe('string');
      expect(message.content).toMatch(/^テストメッセージ:/);
    });
  });

  describe('エラーハンドリング', () => {
    it('should handle function that throws error', () => {
      const errorFunc = () => {
        throw new Error('Test error message');
      };

      expect(errorFunc).toThrow('Test error message');
      expect(errorFunc).toThrow(Error);
    });

    it('should handle custom error types', () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const customErrorFunc = () => {
        throw new CustomError('Custom error message');
      };

      expect(customErrorFunc).toThrow(CustomError);
      expect(customErrorFunc).toThrow('Custom error message');
    });
  });
});