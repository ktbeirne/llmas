/**
 * VRMGlobalHandler Service Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { VRMGlobalHandler, createVRMGlobalHandler } from './vrmGlobalHandler';

// Mock vrmController module
vi.mock('../vrmController', () => ({
  getAvailableExpressions: vi.fn(),
  applyExpression: vi.fn()
}));

import { getAvailableExpressions, applyExpression } from '../vrmController';

// Mock console methods
const mockConsole = {
  log: vi.fn(),
  error: vi.fn()
};

describe('VRMGlobalHandler', () => {
  beforeEach(() => {
    // Clear window.vrmExpression
    delete (global as any).window.vrmExpression;
    
    // Setup console mocks
    vi.spyOn(console, 'log').mockImplementation(mockConsole.log);
    vi.spyOn(console, 'error').mockImplementation(mockConsole.error);

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up global state
    delete (global as any).window.vrmExpression;
    vi.restoreAllMocks();
  });

  describe('factory function', () => {
    it('should create VRMGlobalHandler instance', () => {
      const handler = createVRMGlobalHandler();
      expect(handler).toBeInstanceOf(VRMGlobalHandler);
    });
  });

  describe('initialization', () => {
    it('should be created successfully', () => {
      const handler = new VRMGlobalHandler();
      expect(handler).toBeDefined();
    });

    it('should setup global vrmExpression interface when initialized', () => {
      const handler = new VRMGlobalHandler();
      handler.initialize();

      expect((global as any).window.vrmExpression).toBeDefined();
      expect(typeof (global as any).window.vrmExpression.getAvailableExpressions).toBe('function');
      expect(typeof (global as any).window.vrmExpression.setExpression).toBe('function');
      expect(typeof (global as any).window.vrmExpression.resetToDefaultExpression).toBe('function');
      expect(typeof (global as any).window.vrmExpression.applyExpression).toBe('function');
    });

    it('should not throw when initializing multiple times', () => {
      const handler = new VRMGlobalHandler();
      
      expect(() => {
        handler.initialize();
        handler.initialize(); // Second call
      }).not.toThrow();
    });
  });

  describe('getAvailableExpressions global function', () => {
    let handler: VRMGlobalHandler;

    beforeEach(() => {
      handler = new VRMGlobalHandler();
      handler.initialize();
    });

    it('should call vrmController.getAvailableExpressions and return result', () => {
      const mockExpressions = [
        { name: 'happy', weight: 0 },
        { name: 'sad', weight: 0 }
      ];
      vi.mocked(getAvailableExpressions).mockReturnValue(mockExpressions);

      const result = (global as any).window.vrmExpression.getAvailableExpressions();

      expect(getAvailableExpressions).toHaveBeenCalled();
      expect(result).toBe(mockExpressions);
      expect(mockConsole.log).toHaveBeenCalledWith('[VRMGlobalHandler] グローバル表情取得要求');
      expect(mockConsole.log).toHaveBeenCalledWith('[VRMGlobalHandler] グローバル表情取得結果:', 2);
    });

    it('should handle errors gracefully and return empty array', () => {
      vi.mocked(getAvailableExpressions).mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = (global as any).window.vrmExpression.getAvailableExpressions();

      expect(result).toEqual([]);
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[VRMGlobalHandler] グローバル表情取得エラー:',
        expect.any(Error)
      );
    });

    it('should handle null result from vrmController', () => {
      vi.mocked(getAvailableExpressions).mockReturnValue(null as any);

      const result = (global as any).window.vrmExpression.getAvailableExpressions();

      expect(result).toBe(null);
    });

    it('should handle undefined result from vrmController', () => {
      vi.mocked(getAvailableExpressions).mockReturnValue(undefined as any);

      const result = (global as any).window.vrmExpression.getAvailableExpressions();

      expect(result).toBe(undefined);
    });
  });

  describe('setExpression global function', () => {
    let handler: VRMGlobalHandler;

    beforeEach(() => {
      handler = new VRMGlobalHandler();
      handler.initialize();
    });

    it('should call vrmController.applyExpression with correct parameters', () => {
      vi.mocked(applyExpression).mockReturnValue(true);

      (global as any).window.vrmExpression.setExpression('happy', 0.8);

      expect(applyExpression).toHaveBeenCalledWith('happy', 0.8);
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[VRMGlobalHandler] グローバル表情設定要求:',
        'happy',
        0.8
      );
    });

    it('should call applyExpression with default intensity when not provided', () => {
      vi.mocked(applyExpression).mockReturnValue(true);

      (global as any).window.vrmExpression.setExpression('happy');

      expect(applyExpression).toHaveBeenCalledWith('happy', undefined);
    });

    it('should handle errors gracefully', () => {
      vi.mocked(applyExpression).mockImplementation(() => {
        throw new Error('Test error');
      });

      expect(() => {
        (global as any).window.vrmExpression.setExpression('happy', 0.8);
      }).not.toThrow();

      expect(mockConsole.error).toHaveBeenCalledWith(
        '[VRMGlobalHandler] グローバル表情設定エラー:',
        expect.any(Error)
      );
    });

    it('should handle null expression name', () => {
      vi.mocked(applyExpression).mockReturnValue(false);

      (global as any).window.vrmExpression.setExpression(null, 0.5);

      expect(applyExpression).toHaveBeenCalledWith(null, 0.5);
    });

    it('should handle empty string expression name', () => {
      vi.mocked(applyExpression).mockReturnValue(false);

      (global as any).window.vrmExpression.setExpression('', 0.5);

      expect(applyExpression).toHaveBeenCalledWith('', 0.5);
    });
  });

  describe('resetToDefaultExpression global function', () => {
    let handler: VRMGlobalHandler;

    beforeEach(() => {
      handler = new VRMGlobalHandler();
      handler.initialize();
    });

    it('should log reset request without errors', () => {
      (global as any).window.vrmExpression.resetToDefaultExpression();

      expect(mockConsole.log).toHaveBeenCalledWith(
        '[VRMGlobalHandler] デフォルト表情リセット要求'
      );
    });

    it('should handle implementation errors gracefully', () => {
      // Currently this is an empty implementation that might throw in the future
      expect(() => {
        (global as any).window.vrmExpression.resetToDefaultExpression();
      }).not.toThrow();
    });
  });

  describe('applyExpression global function', () => {
    let handler: VRMGlobalHandler;

    beforeEach(() => {
      handler = new VRMGlobalHandler();
      handler.initialize();
    });

    it('should call vrmController.applyExpression and return result', () => {
      vi.mocked(applyExpression).mockReturnValue(true);

      const result = (global as any).window.vrmExpression.applyExpression('happy', 0.8);

      expect(applyExpression).toHaveBeenCalledWith('happy', 0.8);
      expect(result).toBe(true);
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[VRMGlobalHandler] グローバル表情適用要求:',
        'happy',
        0.8
      );
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[VRMGlobalHandler] グローバル表情適用結果:',
        true
      );
    });

    it('should return false when vrmController.applyExpression fails', () => {
      vi.mocked(applyExpression).mockReturnValue(false);

      const result = (global as any).window.vrmExpression.applyExpression('invalid', 0.8);

      expect(result).toBe(false);
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[VRMGlobalHandler] グローバル表情適用結果:',
        false
      );
    });

    it('should handle errors gracefully and return false', () => {
      vi.mocked(applyExpression).mockImplementation(() => {
        throw new Error('Test error');
      });

      const result = (global as any).window.vrmExpression.applyExpression('happy', 0.8);

      expect(result).toBe(false);
      expect(mockConsole.error).toHaveBeenCalledWith(
        '[VRMGlobalHandler] グローバル表情適用エラー:',
        expect.any(Error)
      );
    });

    it('should handle undefined intensity parameter', () => {
      vi.mocked(applyExpression).mockReturnValue(true);

      const result = (global as any).window.vrmExpression.applyExpression('happy');

      expect(applyExpression).toHaveBeenCalledWith('happy', undefined);
      expect(result).toBe(true);
    });

    it('should handle negative intensity values', () => {
      vi.mocked(applyExpression).mockReturnValue(true);

      const result = (global as any).window.vrmExpression.applyExpression('happy', -0.5);

      expect(applyExpression).toHaveBeenCalledWith('happy', -0.5);
      expect(result).toBe(true);
    });

    it('should handle intensity values greater than 1', () => {
      vi.mocked(applyExpression).mockReturnValue(true);

      const result = (global as any).window.vrmExpression.applyExpression('happy', 1.5);

      expect(applyExpression).toHaveBeenCalledWith('happy', 1.5);
      expect(result).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle missing window object', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const handler = new VRMGlobalHandler();
      
      expect(() => {
        handler.initialize();
      }).toThrow(); // Should throw because window is undefined
      
      // Restore window
      (global as any).window = originalWindow;
    });

    it('should handle window object without ability to add properties', () => {
      const handler = new VRMGlobalHandler();
      
      // Freeze window to prevent property addition
      Object.freeze(global.window);
      
      expect(() => {
        handler.initialize();
      }).toThrow(); // Should throw because window is frozen
      
      // Note: Cannot unfreeze, but test will clean up in afterEach
    });

    it('should handle console methods being undefined', () => {
      vi.spyOn(console, 'log').mockImplementation(undefined as any);
      vi.spyOn(console, 'error').mockImplementation(undefined as any);

      const handler = new VRMGlobalHandler();
      handler.initialize();

      expect(() => {
        (global as any).window.vrmExpression.getAvailableExpressions();
      }).toThrow(); // Should throw because console.log is undefined
    });
  });

  describe('type safety', () => {
    let handler: VRMGlobalHandler;

    beforeEach(() => {
      handler = new VRMGlobalHandler();
      handler.initialize();
    });

    it('should handle non-string expression names', () => {
      vi.mocked(applyExpression).mockReturnValue(false);

      (global as any).window.vrmExpression.setExpression(123, 0.5);

      expect(applyExpression).toHaveBeenCalledWith(123, 0.5);
    });

    it('should handle non-number intensity values', () => {
      vi.mocked(applyExpression).mockReturnValue(false);

      (global as any).window.vrmExpression.setExpression('happy', 'invalid');

      expect(applyExpression).toHaveBeenCalledWith('happy', 'invalid');
    });

    it('should handle object parameters', () => {
      vi.mocked(applyExpression).mockReturnValue(false);

      const obj = { name: 'happy' };
      (global as any).window.vrmExpression.setExpression(obj, 0.5);

      expect(applyExpression).toHaveBeenCalledWith(obj, 0.5);
    });
  });

  describe('performance considerations', () => {
    let handler: VRMGlobalHandler;

    beforeEach(() => {
      handler = new VRMGlobalHandler();
      handler.initialize();
    });

    it('should handle rapid successive calls', () => {
      vi.mocked(applyExpression).mockReturnValue(true);

      for (let i = 0; i < 100; i++) {
        (global as any).window.vrmExpression.setExpression(`expression${i}`, i / 100);
      }

      expect(applyExpression).toHaveBeenCalledTimes(100);
    });

    it('should handle large expression arrays', () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        name: `expression${i}`,
        weight: i / 1000
      }));
      
      vi.mocked(getAvailableExpressions).mockReturnValue(largeArray);

      const result = (global as any).window.vrmExpression.getAvailableExpressions();

      expect(result).toBe(largeArray);
      expect(mockConsole.log).toHaveBeenCalledWith(
        '[VRMGlobalHandler] グローバル表情取得結果:',
        1000
      );
    });
  });
});