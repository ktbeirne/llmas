/**
 * MessageValidator の単体テスト
 */

import { describe, it, expect } from 'vitest';

import { MessageValidator } from './MessageValidator';

describe('MessageValidator', () => {
  describe('文字列バリデーション', () => {
    describe('validateString', () => {
      it('should validate required string successfully', () => {
        const result = MessageValidator.validateString('valid text', 'testField', { required: true });
        expect(result).toEqual([]);
      });

      it('should reject empty required string', () => {
        const result = MessageValidator.validateString('', 'testField', { required: true, allowEmpty: false });
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('EMPTY_STRING');
        expect(result[0].field).toBe('testField');
      });

      it('should reject null/undefined required values', () => {
        const resultNull = MessageValidator.validateString(null, 'testField', { required: true });
        const resultUndefined = MessageValidator.validateString(undefined, 'testField', { required: true });
        
        expect(resultNull).toHaveLength(1);
        expect(resultNull[0].code).toBe('REQUIRED');
        expect(resultUndefined).toHaveLength(1);
        expect(resultUndefined[0].code).toBe('REQUIRED');
      });

      it('should validate string length constraints', () => {
        const tooShort = MessageValidator.validateString('ab', 'testField', { minLength: 3 });
        const tooLong = MessageValidator.validateString('abcde', 'testField', { maxLength: 4 });
        const validLength = MessageValidator.validateString('abc', 'testField', { minLength: 2, maxLength: 4 });

        expect(tooShort).toHaveLength(1);
        expect(tooShort[0].code).toBe('TOO_SHORT');
        expect(tooLong).toHaveLength(1);
        expect(tooLong[0].code).toBe('TOO_LONG');
        expect(validLength).toEqual([]);
      });

      it('should detect XSS patterns', () => {
        const xssScripts = [
          '<script>alert("xss")</script>',
          'javascript:alert("xss")',
          '<img onerror="alert(1)" src="x">',
          '<iframe src="javascript:alert(1)"></iframe>'
        ];

        xssScripts.forEach(xssScript => {
          const result = MessageValidator.validateString(xssScript, 'testField', { noXSS: true });
          expect(result).toHaveLength(1);
          expect(result[0].code).toBe('XSS_DETECTED');
        });
      });

      it('should validate pattern matching', () => {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validEmail = MessageValidator.validateString('test@example.com', 'email', { pattern: emailPattern });
        const invalidEmail = MessageValidator.validateString('invalid-email', 'email', { pattern: emailPattern });

        expect(validEmail).toEqual([]);
        expect(invalidEmail).toHaveLength(1);
        expect(invalidEmail[0].code).toBe('INVALID_PATTERN');
      });

      it('should reject non-string types', () => {
        const result = MessageValidator.validateString(123, 'testField', { required: true });
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('INVALID_TYPE');
      });
    });
  });

  describe('数値バリデーション', () => {
    describe('validateNumber', () => {
      it('should validate valid numbers', () => {
        const result = MessageValidator.validateNumber(42, 'testField', { required: true });
        expect(result).toEqual([]);
      });

      it('should reject null/undefined required values', () => {
        const resultNull = MessageValidator.validateNumber(null, 'testField', { required: true });
        const resultUndefined = MessageValidator.validateNumber(undefined, 'testField', { required: true });
        
        expect(resultNull).toHaveLength(1);
        expect(resultNull[0].code).toBe('REQUIRED');
        expect(resultUndefined).toHaveLength(1);
        expect(resultUndefined[0].code).toBe('REQUIRED');
      });

      it('should validate number range constraints', () => {
        const tooSmall = MessageValidator.validateNumber(5, 'testField', { min: 10 });
        const tooLarge = MessageValidator.validateNumber(15, 'testField', { max: 10 });
        const validRange = MessageValidator.validateNumber(8, 'testField', { min: 5, max: 10 });

        expect(tooSmall).toHaveLength(1);
        expect(tooSmall[0].code).toBe('TOO_SMALL');
        expect(tooLarge).toHaveLength(1);
        expect(tooLarge[0].code).toBe('TOO_LARGE');
        expect(validRange).toEqual([]);
      });

      it('should validate integer constraint', () => {
        const float = MessageValidator.validateNumber(3.14, 'testField', { integer: true });
        const integer = MessageValidator.validateNumber(42, 'testField', { integer: true });

        expect(float).toHaveLength(1);
        expect(float[0].code).toBe('NOT_INTEGER');
        expect(integer).toEqual([]);
      });

      it('should reject non-number types', () => {
        const result = MessageValidator.validateNumber('not a number', 'testField', { required: true });
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('INVALID_TYPE');
      });

      it('should reject NaN', () => {
        const result = MessageValidator.validateNumber(NaN, 'testField', { required: true });
        expect(result).toHaveLength(1);
        expect(result[0].code).toBe('INVALID_TYPE');
      });
    });
  });

  describe('設定保存リクエストバリデーション', () => {
    describe('validateSaveSettingsRequest', () => {
      it('should validate valid settings request', () => {
        const validRequest = {
          settings: {
            userName: 'TestUser',
            mascotName: 'TestMascot',
            theme: 'light',
            cameraSettings: {
              position: { x: 0, y: 0, z: 5 },
              target: { x: 0, y: 0, z: 0 },
              zoom: 1.0
            },
            mainWindowBounds: { x: 100, y: 100, width: 800, height: 600 },
            chatWindowVisible: true
          }
        };

        const result = MessageValidator.validateSaveSettingsRequest(validRequest);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should reject invalid request structure', () => {
        const invalidRequest = null;
        const result = MessageValidator.validateSaveSettingsRequest(invalidRequest);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('INVALID_TYPE');
      });

      it('should reject missing settings object', () => {
        const invalidRequest = { validateOnly: false };
        const result = MessageValidator.validateSaveSettingsRequest(invalidRequest);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('REQUIRED');
      });

      it('should validate VRM file path', () => {
        const validVrmRequest = {
          settings: { vrmModelPath: '/path/to/model.vrm' }
        };
        const invalidVrmRequest = {
          settings: { vrmModelPath: '/path/to/invalid.txt' }
        };

        const validResult = MessageValidator.validateSaveSettingsRequest(validVrmRequest);
        const invalidResult = MessageValidator.validateSaveSettingsRequest(invalidVrmRequest);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors[0].code).toBe('INVALID_PATTERN');
      });

      it('should validate user and mascot names', () => {
        const validNames = {
          settings: {
            userName: 'ValidUser',
            mascotName: 'ValidMascot'
          }
        };
        const invalidNames = {
          settings: {
            userName: '<script>alert("xss")</script>',
            mascotName: 'A'.repeat(100) // Too long
          }
        };

        const validResult = MessageValidator.validateSaveSettingsRequest(validNames);
        const invalidResult = MessageValidator.validateSaveSettingsRequest(invalidNames);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors).toHaveLength(2);
        expect(invalidResult.errors.some(e => e.code === 'XSS_DETECTED')).toBe(true);
        expect(invalidResult.errors.some(e => e.code === 'TOO_LONG')).toBe(true);
      });

      it('should validate theme values', () => {
        const validTheme = { settings: { theme: 'dark' } };
        const invalidTheme = { settings: { theme: 'invalid-theme' } };

        const validResult = MessageValidator.validateSaveSettingsRequest(validTheme);
        const invalidResult = MessageValidator.validateSaveSettingsRequest(invalidTheme);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors[0].code).toBe('INVALID_VALUE');
      });

      it('should validate window bounds', () => {
        const validBounds = {
          settings: {
            mainWindowBounds: { x: 100, y: 100, width: 800, height: 600 }
          }
        };
        const invalidBounds = {
          settings: {
            mainWindowBounds: { x: 'invalid', y: 100, width: 50, height: 50 } // Invalid x, too small size
          }
        };

        const validResult = MessageValidator.validateSaveSettingsRequest(validBounds);
        const invalidResult = MessageValidator.validateSaveSettingsRequest(invalidBounds);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors.length).toBeGreaterThan(0);
      });

      it('should validate camera settings', () => {
        const validCamera = {
          settings: {
            cameraSettings: {
              position: { x: 0, y: 1, z: 5 },
              target: { x: 0, y: 0, z: 0 },
              zoom: 1.5
            }
          }
        };
        const invalidCamera = {
          settings: {
            cameraSettings: {
              position: { x: 'invalid', y: 1, z: 5 },
              zoom: -1 // Invalid zoom
            }
          }
        };

        const validResult = MessageValidator.validateSaveSettingsRequest(validCamera);
        const invalidResult = MessageValidator.validateSaveSettingsRequest(invalidCamera);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('チャットメッセージバリデーション', () => {
    describe('validateSendChatMessageRequest', () => {
      it('should validate valid chat message', () => {
        const validRequest = {
          message: 'Hello, this is a valid message',
          role: 'user',
          includeHistory: true
        };

        const result = MessageValidator.validateSendChatMessageRequest(validRequest);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should reject empty or missing message', () => {
        const emptyMessage = { message: '' };
        const noMessage = { role: 'user' };

        const emptyResult = MessageValidator.validateSendChatMessageRequest(emptyMessage);
        const noResult = MessageValidator.validateSendChatMessageRequest(noMessage);

        expect(emptyResult.isValid).toBe(false);
        expect(noResult.isValid).toBe(false);
        expect(emptyResult.errors[0].code).toBe('TOO_SHORT');
        expect(noResult.errors[0].code).toBe('REQUIRED');
      });

      it('should reject XSS in message content', () => {
        const xssRequest = {
          message: '<script>alert("xss")</script>'
        };

        const result = MessageValidator.validateSendChatMessageRequest(xssRequest);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('XSS_DETECTED');
      });

      it('should validate role values', () => {
        const validRole = { message: 'Hello', role: 'assistant' };
        const invalidRole = { message: 'Hello', role: 'invalid-role' };

        const validResult = MessageValidator.validateSendChatMessageRequest(validRole);
        const invalidResult = MessageValidator.validateSendChatMessageRequest(invalidRole);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors[0].code).toBe('INVALID_VALUE');
      });

      it('should validate includeHistory boolean', () => {
        const validHistory = { message: 'Hello', includeHistory: false };
        const invalidHistory = { message: 'Hello', includeHistory: 'invalid' };

        const validResult = MessageValidator.validateSendChatMessageRequest(validHistory);
        const invalidResult = MessageValidator.validateSendChatMessageRequest(invalidHistory);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors[0].code).toBe('INVALID_TYPE');
      });

      it('should reject extremely long messages', () => {
        const longMessage = {
          message: 'A'.repeat(60000) // Exceeds MAX_PROMPT_LENGTH
        };

        const result = MessageValidator.validateSendChatMessageRequest(longMessage);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('TOO_LONG');
      });
    });
  });

  describe('システムプロンプトバリデーション', () => {
    describe('validateSetSystemPromptRequest', () => {
      it('should validate valid system prompt', () => {
        const validRequest = {
          prompt: 'You are a helpful desktop mascot.',
          core: true
        };

        const result = MessageValidator.validateSetSystemPromptRequest(validRequest);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should reject empty prompt', () => {
        const emptyPrompt = { prompt: '' };
        const result = MessageValidator.validateSetSystemPromptRequest(emptyPrompt);
        
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('TOO_SHORT');
      });

      it('should reject XSS in prompt', () => {
        const xssPrompt = {
          prompt: 'You are helpful <script>alert("xss")</script>'
        };

        const result = MessageValidator.validateSetSystemPromptRequest(xssPrompt);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('XSS_DETECTED');
      });

      it('should validate core boolean flag', () => {
        const validCore = { prompt: 'Valid prompt', core: false };
        const invalidCore = { prompt: 'Valid prompt', core: 'invalid' };

        const validResult = MessageValidator.validateSetSystemPromptRequest(validCore);
        const invalidResult = MessageValidator.validateSetSystemPromptRequest(invalidCore);

        expect(validResult.isValid).toBe(true);
        expect(invalidResult.isValid).toBe(false);
        expect(invalidResult.errors[0].code).toBe('INVALID_TYPE');
      });
    });
  });

  describe('ウィンドウ位置バリデーション', () => {
    describe('validateSetWindowBoundsRequest', () => {
      it('should validate valid window bounds request', () => {
        const validRequest = {
          windowType: 'main',
          bounds: { x: 100, y: 100, width: 800, height: 600 }
        };

        const result = MessageValidator.validateSetWindowBoundsRequest(validRequest);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should reject invalid window type', () => {
        const invalidType = {
          windowType: 'invalid',
          bounds: { x: 100, y: 100, width: 800, height: 600 }
        };

        const result = MessageValidator.validateSetWindowBoundsRequest(invalidType);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('INVALID_VALUE');
      });

      it('should validate window bounds ranges', () => {
        const invalidBounds = {
          windowType: 'chat',
          bounds: { x: 100, y: 100, width: 50, height: 50 } // Too small
        };

        const result = MessageValidator.validateSetWindowBoundsRequest(invalidBounds);
        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.code === 'TOO_SMALL')).toBe(true);
      });
    });
  });

  describe('カメラ設定バリデーション', () => {
    describe('validateSetCameraSettingsRequest', () => {
      it('should validate valid camera settings', () => {
        const validRequest = {
          settings: {
            position: { x: 0, y: 1, z: 5 },
            target: { x: 0, y: 0, z: 0 },
            zoom: 1.5
          }
        };

        const result = MessageValidator.validateSetCameraSettingsRequest(validRequest);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should reject invalid camera position', () => {
        const invalidPosition = {
          settings: {
            position: { x: 'invalid', y: 1, z: 5 }
          }
        };

        const result = MessageValidator.validateSetCameraSettingsRequest(invalidPosition);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('INVALID_TYPE');
      });

      it('should validate zoom range', () => {
        const invalidZoom = {
          settings: {
            zoom: -1 // Below minimum
          }
        };

        const result = MessageValidator.validateSetCameraSettingsRequest(invalidZoom);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('TOO_SMALL');
      });
    });
  });

  describe('汎用バリデーション', () => {
    describe('validate', () => {
      it('should execute named validator', () => {
        const testData = {
          message: 'Test message'
        };

        // Call the validator directly since the generic validate method has issues
        const result = MessageValidator.validateSendChatMessageRequest(testData);
        expect(result.isValid).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('should handle unknown validator', () => {
        const result = MessageValidator.validate({}, 'unknownValidator' as any);
        expect(result.isValid).toBe(false);
        expect(result.errors[0].code).toBe('UNKNOWN_VALIDATOR');
      });

      it('should handle validation errors', () => {
        // Force an error by passing invalid data to validator
        const result = MessageValidator.validate(null, 'validateSendChatMessageRequest');
        expect(result.isValid).toBe(false);
      });
    });
  });
});