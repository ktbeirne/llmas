import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SettingsStore } from './settingsStore';
import { WINDOW_PRESETS } from '../config/constants';

// Mock electron-store
vi.mock('electron-store', () => {
  return {
    default: vi.fn(() => ({
      get: vi.fn(),
      set: vi.fn(),
      has: vi.fn(),
      clear: vi.fn()
    }))
  };
});

describe('SettingsStore', () => {
  let settingsStore: SettingsStore;
  let mockStore: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
    
    // Create a new instance for each test
    settingsStore = new SettingsStore();
    mockStore = settingsStore['store']; // Access private store for testing
  });

  describe('getWindowSize', () => {
    it('should return default window size when no settings exist', () => {
      mockStore.has.mockReturnValue(false);
      
      const result = settingsStore.getWindowSize();
      
      expect(result).toEqual({
        width: 400,
        height: 600,
        preset: 'medium'
      });
    });

    it('should return stored window size when settings exist', () => {
      const storedSize = { width: 500, height: 700, preset: 'large' };
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue(storedSize);
      
      const result = settingsStore.getWindowSize();
      
      expect(mockStore.get).toHaveBeenCalledWith('windowSize');
      expect(result).toEqual(storedSize);
    });
  });

  describe('setWindowSize', () => {
    it('should save window size settings', () => {
      const newSize = { width: 600, height: 800, preset: 'large' };
      
      settingsStore.setWindowSize(newSize);
      
      expect(mockStore.set).toHaveBeenCalledWith('windowSize', newSize);
    });

    it('should validate window size constraints', () => {
      const invalidSize = { width: 100, height: 50, preset: 'custom' };
      
      expect(() => settingsStore.setWindowSize(invalidSize)).toThrow('Window size must be at least 200x300');
    });
  });

  describe('getVrmModelPath', () => {
    it('should return default VRM path when no settings exist', () => {
      mockStore.has.mockReturnValue(false);
      
      const result = settingsStore.getVrmModelPath();
      
      expect(result).toBe('/avatar.vrm');
    });

    it('should return stored VRM path when settings exist', () => {
      const storedPath = '/custom/model.vrm';
      mockStore.has.mockReturnValue(true);
      mockStore.get.mockReturnValue(storedPath);
      
      const result = settingsStore.getVrmModelPath();
      
      expect(mockStore.get).toHaveBeenCalledWith('vrmModelPath');
      expect(result).toBe(storedPath);
    });
  });

  describe('setVrmModelPath', () => {
    it('should save VRM model path', () => {
      const newPath = '/new/model.vrm';
      
      settingsStore.setVrmModelPath(newPath);
      
      expect(mockStore.set).toHaveBeenCalledWith('vrmModelPath', newPath);
    });

    it('should validate VRM file extension', () => {
      const invalidPath = '/model.txt';
      
      expect(() => settingsStore.setVrmModelPath(invalidPath)).toThrow('File must have .vrm extension');
    });
  });

  describe('resetToDefaults', () => {
    it('should clear all settings', () => {
      settingsStore.resetToDefaults();
      
      expect(mockStore.clear).toHaveBeenCalled();
    });
  });
});