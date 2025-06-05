/**
 * useSettingsCategory Hook Tests - FSD Phase 2
 * カテゴリ別設定フックのテスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { settingsStore } from '../../model/settings-store';
import type { ChatSettings } from '../../types';

import { useSettingsCategory } from './useSettingsCategory';

// Mock the settings store
vi.mock('../../model/settings-store', () => ({
  settingsStore: {
    getSettingsByCategory: vi.fn(),
    subscribeToCategory: vi.fn(),
    updateChatSettings: vi.fn(),
    updateDisplaySettings: vi.fn(),
    updateMouseFollowSettings: vi.fn(),
    updateExpressionSettings: vi.fn(),
    updateVRMSettings: vi.fn(),
    updateAudioSettings: vi.fn(),
    validateChatSettings: vi.fn(),
    validateDisplaySettings: vi.fn(),
    resetCategory: vi.fn()
  }
}));

const mockChatSettings: ChatSettings = {
  apiProvider: 'gemini',
  apiKey: 'test-key',
  systemPrompt: 'Test prompt',
  maxTokens: 2048,
  temperature: 0.7,
  saveHistory: true,
  maxHistoryItems: 100,
  showTimestamp: true,
  fontSize: 'medium',
  theme: 'light'
};

describe('useSettingsCategory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStore.getSettingsByCategory.mockReturnValue(mockChatSettings);
    settingsStore.validateChatSettings.mockReturnValue([]);
  });

  it('カテゴリ別の設定を取得できる', () => {
    const { result } = renderHook(() => useSettingsCategory<ChatSettings>('chat'));

    expect(result.current.settings).toEqual(mockChatSettings);
    expect(settingsStore.getSettingsByCategory).toHaveBeenCalledWith('chat');
  });

  it('カテゴリ別の設定変更を購読できる', () => {
    let callback: any;
    settingsStore.subscribeToCategory.mockImplementation((category, cb) => {
      callback = cb;
      return () => {};
    });

    const { result } = renderHook(() => useSettingsCategory<ChatSettings>('chat'));

    const newSettings: ChatSettings = {
      ...mockChatSettings,
      apiKey: 'new-key'
    };

    act(() => {
      callback(newSettings);
    });

    expect(result.current.settings.apiKey).toBe('new-key');
  });

  it('チャット設定を更新できる', async () => {
    const { result } = renderHook(() => useSettingsCategory<ChatSettings>('chat'));

    const updates = { apiKey: 'new-key', temperature: 0.8 };

    await act(async () => {
      await result.current.updateSettings(updates);
    });

    expect(settingsStore.updateChatSettings).toHaveBeenCalledWith(updates);
  });

  it('表示設定を更新できる', async () => {
    const { result } = renderHook(() => useSettingsCategory('display'));

    const updates = { windowWidth: 500 };

    await act(async () => {
      await result.current.updateSettings(updates);
    });

    expect(settingsStore.updateDisplaySettings).toHaveBeenCalledWith(updates);
  });

  it('設定をバリデーションできる', () => {
    const validationErrors = [
      {
        category: 'chat' as const,
        key: 'temperature',
        message: 'Temperature must be between 0 and 2',
        value: 3.0
      }
    ];
    settingsStore.validateChatSettings.mockReturnValue(validationErrors);

    const { result } = renderHook(() => useSettingsCategory<ChatSettings>('chat'));

    const errors = result.current.validateSettings({ temperature: 3.0 });

    expect(errors).toEqual(validationErrors);
    expect(settingsStore.validateChatSettings).toHaveBeenCalledWith({ temperature: 3.0 });
  });

  it('カテゴリをリセットできる', async () => {
    const { result } = renderHook(() => useSettingsCategory<ChatSettings>('chat'));

    await act(async () => {
      await result.current.resetToDefaults();
    });

    expect(settingsStore.resetCategory).toHaveBeenCalledWith('chat');
  });

  it('一時的な変更を管理できる', () => {
    const { result } = renderHook(() => useSettingsCategory<ChatSettings>('chat'));

    act(() => {
      result.current.setTempSettings({ apiKey: 'temp-key' });
    });

    expect(result.current.tempSettings).toEqual({ apiKey: 'temp-key' });
    expect(result.current.hasTempChanges).toBe(true);
  });

  it('一時的な変更を適用できる', async () => {
    const { result } = renderHook(() => useSettingsCategory<ChatSettings>('chat'));

    act(() => {
      result.current.setTempSettings({ apiKey: 'temp-key', temperature: 0.9 });
    });

    await act(async () => {
      await result.current.applyTempChanges();
    });

    expect(settingsStore.updateChatSettings).toHaveBeenCalledWith({
      apiKey: 'temp-key',
      temperature: 0.9
    });
    expect(result.current.tempSettings).toEqual({});
    expect(result.current.hasTempChanges).toBe(false);
  });

  it('一時的な変更を破棄できる', () => {
    const { result } = renderHook(() => useSettingsCategory<ChatSettings>('chat'));

    act(() => {
      result.current.setTempSettings({ apiKey: 'temp-key' });
    });

    act(() => {
      result.current.discardTempChanges();
    });

    expect(result.current.tempSettings).toEqual({});
    expect(result.current.hasTempChanges).toBe(false);
  });

  it('コンポーネントのアンマウント時に購読を解除する', () => {
    const unsubscribe = vi.fn();
    settingsStore.subscribeToCategory.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useSettingsCategory<ChatSettings>('chat'));

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('異なるカテゴリに対して適切な更新関数を呼び出す', async () => {
    const testCases = [
      { category: 'chat' as const, updateFn: 'updateChatSettings' },
      { category: 'display' as const, updateFn: 'updateDisplaySettings' },
      { category: 'mouseFollow' as const, updateFn: 'updateMouseFollowSettings' },
      { category: 'expression' as const, updateFn: 'updateExpressionSettings' },
      { category: 'vrm' as const, updateFn: 'updateVRMSettings' },
      { category: 'audio' as const, updateFn: 'updateAudioSettings' }
    ];

    for (const { category, updateFn } of testCases) {
      vi.clearAllMocks();
      
      const { result } = renderHook(() => useSettingsCategory(category));
      
      await act(async () => {
        await result.current.updateSettings({ test: 'value' });
      });

      expect(settingsStore[updateFn]).toHaveBeenCalledWith({ test: 'value' });
    }
  });
});