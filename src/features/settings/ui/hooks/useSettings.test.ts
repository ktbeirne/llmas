/**
 * useSettings Hook Tests - FSD Phase 2
 * 設定フックのテスト（TDD: RED Phase）
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { settingsStore } from '../../model/settings-store';
import type { AppSettings, ChatSettings } from '../../types';

import { useSettings } from './useSettings';

// Mock the settings store
vi.mock('../../model/settings-store', () => ({
  settingsStore: {
    getState: vi.fn(),
    subscribe: vi.fn(),
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
    updateChatSettings: vi.fn(),
    updateDisplaySettings: vi.fn(),
    updateMouseFollowSettings: vi.fn(),
    hasUnsavedChanges: vi.fn(),
    getChangedCategories: vi.fn()
  }
}));

const mockSettings: AppSettings = {
  chat: {
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
  },
  display: {
    windowWidth: 400,
    windowHeight: 600,
    alwaysOnTop: true,
    windowOpacity: 1.0,
    defaultPosition: 'bottom-right',
    antialiasing: true,
    shadowQuality: 'medium',
    fps: 30
  },
  expression: {
    enableAutoExpressions: true,
    expressionChangeInterval: 30,
    enableBlink: true,
    blinkIntervalMin: 3,
    blinkIntervalMax: 7,
    expressionIntensity: 1.0,
    customExpressions: {}
  },
  mouseFollow: {
    enabled: true,
    sensitivity: 0.5,
    smoothing: 0.7,
    deadZone: 50,
    updateFrequency: 16
  },
  vrm: {
    modelPath: null,
    animationPath: null,
    modelScale: 1.0,
    enablePhysics: true,
    physicsQuality: 'medium',
    enableSpringBone: true,
    springBoneStiffness: 1.0,
    springBoneDamping: 0.1
  },
  audio: {
    enableTTS: false,
    ttsVoice: '',
    ttsSpeed: 1.0,
    ttsVolume: 1.0,
    enableSoundEffects: true,
    soundEffectsVolume: 0.5
  },
  version: '1.0.0',
  lastUpdated: Date.now()
};

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsStore.getState.mockReturnValue({
      settings: mockSettings,
      isLoading: false,
      error: null
    });
  });

  it('現在の設定を取得できる', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.settings).toEqual(mockSettings);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('設定の変更を購読できる', () => {
    let callback: any;
    settingsStore.subscribe.mockImplementation((cb) => {
      callback = cb;
      return () => {};
    });

    const { result } = renderHook(() => useSettings());

    const newSettings = {
      ...mockSettings,
      chat: { ...mockSettings.chat, apiKey: 'new-key' }
    };

    act(() => {
      callback({
        settings: newSettings,
        isLoading: false,
        error: null
      });
    });

    expect(result.current.settings.chat.apiKey).toBe('new-key');
  });

  it('設定を読み込める', async () => {
    settingsStore.loadSettings.mockResolvedValue(undefined);

    const { result } = renderHook(() => useSettings());

    await act(async () => {
      await result.current.loadSettings();
    });

    expect(settingsStore.loadSettings).toHaveBeenCalled();
  });

  it('設定を保存できる', async () => {
    settingsStore.saveSettings.mockResolvedValue(true);

    const { result } = renderHook(() => useSettings());

    let saveResult: boolean;
    await act(async () => {
      saveResult = await result.current.saveSettings();
    });

    expect(saveResult!).toBe(true);
    expect(settingsStore.saveSettings).toHaveBeenCalled();
  });

  it('チャット設定を更新できる', async () => {
    const { result } = renderHook(() => useSettings());

    const updates: Partial<ChatSettings> = {
      apiKey: 'new-key',
      temperature: 0.8
    };

    await act(async () => {
      await result.current.updateChatSettings(updates);
    });

    expect(settingsStore.updateChatSettings).toHaveBeenCalledWith(updates);
  });

  it('表示設定を更新できる', async () => {
    const { result } = renderHook(() => useSettings());

    const updates = {
      windowWidth: 500,
      windowHeight: 700
    };

    await act(async () => {
      await result.current.updateDisplaySettings(updates);
    });

    expect(settingsStore.updateDisplaySettings).toHaveBeenCalledWith(updates);
  });

  it('マウス追従設定を更新できる', async () => {
    const { result } = renderHook(() => useSettings());

    const updates = {
      enabled: false,
      sensitivity: 0.3
    };

    await act(async () => {
      await result.current.updateMouseFollowSettings(updates);
    });

    expect(settingsStore.updateMouseFollowSettings).toHaveBeenCalledWith(updates);
  });

  it('未保存の変更を検出できる', () => {
    settingsStore.hasUnsavedChanges.mockReturnValue(true);
    settingsStore.getChangedCategories.mockReturnValue(['chat', 'display']);

    const { result } = renderHook(() => useSettings());

    expect(result.current.hasUnsavedChanges).toBe(true);
    expect(result.current.changedCategories).toEqual(['chat', 'display']);
  });

  it('コンポーネントのアンマウント時に購読を解除する', () => {
    const unsubscribe = vi.fn();
    settingsStore.subscribe.mockReturnValue(unsubscribe);

    const { unmount } = renderHook(() => useSettings());

    unmount();

    expect(unsubscribe).toHaveBeenCalled();
  });

  it('エラー状態を表示できる', () => {
    settingsStore.getState.mockReturnValue({
      settings: mockSettings,
      isLoading: false,
      error: 'Failed to load settings'
    });

    const { result } = renderHook(() => useSettings());

    expect(result.current.error).toBe('Failed to load settings');
  });

  it('ローディング状態を表示できる', () => {
    settingsStore.getState.mockReturnValue({
      settings: mockSettings,
      isLoading: true,
      error: null
    });

    const { result } = renderHook(() => useSettings());

    expect(result.current.isLoading).toBe(true);
  });
});