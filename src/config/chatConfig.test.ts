/**
 * chatConfig.test.ts - チャット設定管理のテスト
 * 
 * TDD: RED Phase - 失敗するテストを先に書く
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { ChatConfig, ChatConfigOptions, DEFAULT_CHAT_CONFIG } from './chatConfig';

describe('ChatConfig', () => {
  describe('初期化', () => {
    it('デフォルト設定で初期化される', () => {
      const config = new ChatConfig();
      
      expect(config.getConfig()).toEqual(DEFAULT_CHAT_CONFIG);
    });

    it('カスタム設定で初期化できる', () => {
      const customConfig: ChatConfigOptions = {
        userName: 'テストユーザー',
        mascotName: 'テストマスコット',
        maxMessageLength: 5000,
        enableAutoScroll: false,
        enableEnterToSend: false,
        theme: 'dark'
      };

      const config = new ChatConfig(customConfig);
      
      expect(config.getConfig()).toEqual(customConfig);
    });

    it('部分的なカスタム設定でも初期化できる', () => {
      const partialConfig: Partial<ChatConfigOptions> = {
        userName: 'カスタムユーザー',
        theme: 'sakura'
      };

      const config = new ChatConfig(partialConfig);
      const result = config.getConfig();
      
      expect(result.userName).toBe('カスタムユーザー');
      expect(result.theme).toBe('sakura');
      expect(result.mascotName).toBe(DEFAULT_CHAT_CONFIG.mascotName);
      expect(result.maxMessageLength).toBe(DEFAULT_CHAT_CONFIG.maxMessageLength);
    });
  });

  describe('設定の取得', () => {
    let config: ChatConfig;

    beforeEach(() => {
      config = new ChatConfig();
    });

    it('個別の設定値を取得できる', () => {
      expect(config.getUserName()).toBe(DEFAULT_CHAT_CONFIG.userName);
      expect(config.getMascotName()).toBe(DEFAULT_CHAT_CONFIG.mascotName);
      expect(config.getMaxMessageLength()).toBe(DEFAULT_CHAT_CONFIG.maxMessageLength);
      expect(config.isAutoScrollEnabled()).toBe(DEFAULT_CHAT_CONFIG.enableAutoScroll);
      expect(config.isEnterToSendEnabled()).toBe(DEFAULT_CHAT_CONFIG.enableEnterToSend);
      expect(config.getTheme()).toBe(DEFAULT_CHAT_CONFIG.theme);
    });

    it('全ての設定を一括で取得できる', () => {
      const allConfig = config.getConfig();
      
      expect(allConfig).toEqual(DEFAULT_CHAT_CONFIG);
    });
  });

  describe('設定の更新', () => {
    let config: ChatConfig;

    beforeEach(() => {
      config = new ChatConfig();
    });

    it('個別の設定値を更新できる', () => {
      config.setUserName('新しいユーザー');
      expect(config.getUserName()).toBe('新しいユーザー');

      config.setMascotName('新しいマスコット');
      expect(config.getMascotName()).toBe('新しいマスコット');

      config.setMaxMessageLength(3000);
      expect(config.getMaxMessageLength()).toBe(3000);

      config.setAutoScrollEnabled(false);
      expect(config.isAutoScrollEnabled()).toBe(false);

      config.setEnterToSendEnabled(false);
      expect(config.isEnterToSendEnabled()).toBe(false);

      config.setTheme('ocean');
      expect(config.getTheme()).toBe('ocean');
    });

    it('複数の設定を一括で更新できる', () => {
      const updates: Partial<ChatConfigOptions> = {
        userName: '一括更新ユーザー',
        mascotName: '一括更新マスコット',
        theme: 'forest'
      };

      config.updateConfig(updates);
      
      expect(config.getUserName()).toBe('一括更新ユーザー');
      expect(config.getMascotName()).toBe('一括更新マスコット');
      expect(config.getTheme()).toBe('forest');
      // 更新されていない値は維持される
      expect(config.getMaxMessageLength()).toBe(DEFAULT_CHAT_CONFIG.maxMessageLength);
    });
  });

  describe('バリデーション', () => {
    let config: ChatConfig;

    beforeEach(() => {
      config = new ChatConfig();
    });

    it('ユーザー名が空文字の場合エラーになる', () => {
      expect(() => config.setUserName('')).toThrow('ユーザー名は必須です');
    });

    it('ユーザー名が50文字を超える場合エラーになる', () => {
      const longName = 'あ'.repeat(51);
      expect(() => config.setUserName(longName)).toThrow('ユーザー名は50文字以内で入力してください');
    });

    it('マスコット名が空文字の場合エラーになる', () => {
      expect(() => config.setMascotName('')).toThrow('マスコット名は必須です');
    });

    it('マスコット名が50文字を超える場合エラーになる', () => {
      const longName = 'あ'.repeat(51);
      expect(() => config.setMascotName(longName)).toThrow('マスコット名は50文字以内で入力してください');
    });

    it('最大メッセージ長が100未満の場合エラーになる', () => {
      expect(() => config.setMaxMessageLength(99)).toThrow('最大メッセージ長は100以上10000以下で設定してください');
    });

    it('最大メッセージ長が10000を超える場合エラーになる', () => {
      expect(() => config.setMaxMessageLength(10001)).toThrow('最大メッセージ長は100以上10000以下で設定してください');
    });

    it('無効なテーマを設定した場合エラーになる', () => {
      expect(() => config.setTheme('invalid-theme' as any)).toThrow('無効なテーマです');
    });
  });

  describe('設定のリセット', () => {
    it('設定をデフォルト値にリセットできる', () => {
      const config = new ChatConfig({
        userName: 'カスタムユーザー',
        mascotName: 'カスタムマスコット',
        theme: 'dark'
      });

      config.resetToDefaults();
      
      expect(config.getConfig()).toEqual(DEFAULT_CHAT_CONFIG);
    });
  });

  describe('設定のシリアライズ', () => {
    it('設定をJSON文字列に変換できる', () => {
      const config = new ChatConfig({
        userName: 'テストユーザー',
        theme: 'sakura'
      });

      const json = config.toJSON();
      const parsed = JSON.parse(json);
      
      expect(parsed.userName).toBe('テストユーザー');
      expect(parsed.theme).toBe('sakura');
    });

    it('JSON文字列から設定を復元できる', () => {
      const originalConfig = new ChatConfig({
        userName: '元のユーザー',
        mascotName: '元のマスコット',
        theme: 'ocean'
      });

      const json = originalConfig.toJSON();
      const restoredConfig = ChatConfig.fromJSON(json);
      
      expect(restoredConfig.getConfig()).toEqual(originalConfig.getConfig());
    });
  });
});