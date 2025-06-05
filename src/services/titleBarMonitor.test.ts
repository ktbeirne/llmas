/**
 * TitleBarMonitor Service Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { TitleBarMonitor, createTitleBarMonitor } from './titleBarMonitor';

// DOM manipulation test helpers
const createMockElement = (tag: string, className?: string) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  document.body.appendChild(element);
  return element;
};

// Mock electronAPI
const mockElectronAPI = {
  logRendererMessage: vi.fn()
};

beforeEach(() => {
  // Setup DOM
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.title = 'Test Title';
  
  // Mock window.electronAPI
  (global as any).window = {
    ...global.window,
    electronAPI: mockElectronAPI,
    setInterval: vi.fn(),
    clearInterval: vi.fn(),
    addEventListener: vi.fn(),
    setTimeout: vi.fn(),
    clearTimeout: vi.fn()
  };
  
  // Reset all mocks
  vi.clearAllMocks();
});

afterEach(() => {
  document.head.innerHTML = '';
  document.body.innerHTML = '';
  document.title = '';
});

describe('TitleBarMonitor', () => {
  describe('factory function', () => {
    it('should create TitleBarMonitor instance', () => {
      const monitor = createTitleBarMonitor();
      expect(monitor).toBeInstanceOf(TitleBarMonitor);
    });
  });

  describe('initialization', () => {
    it('should be created with correct initial state', () => {
      const monitor = new TitleBarMonitor();
      expect(monitor).toBeDefined();
    });
  });

  describe('start() method', () => {
    let monitor: TitleBarMonitor;

    beforeEach(() => {
      monitor = new TitleBarMonitor();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      monitor.stop();
    });

    it('should start monitoring successfully', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      monitor.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('[TitleBarMonitor] Starting titlebar monitoring...');
    });

    it('should not start multiple times', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      monitor.start();
      monitor.start(); // Second call should be ignored
      
      expect(consoleSpy).toHaveBeenCalledTimes(1);
    });

    it('should setup event listeners', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      monitor.start();
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('blur', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should setup periodic monitoring', () => {
      const setIntervalSpy = vi.spyOn(window, 'setInterval');
      monitor.start();
      
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 2000);
    });
  });

  describe('title bar hiding functionality', () => {
    let monitor: TitleBarMonitor;

    beforeEach(() => {
      monitor = new TitleBarMonitor();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      monitor.stop();
    });

    it('should clear document.title', () => {
      document.title = 'Test Title';
      monitor.start();
      
      // Trigger the interval callback
      vi.advanceTimersByTime(2000);
      
      expect(document.title).toBe('');
    });

    it('should hide title elements', () => {
      // Create mock title elements
      const titleElement = createMockElement('title');
      const headerElement = createMockElement('header');
      const titleBarElement = createMockElement('div', 'titlebar');
      
      monitor.start();
      vi.advanceTimersByTime(2000);
      
      expect(titleElement.style.display).toBe('none');
      expect(headerElement.style.display).toBe('none');
      expect(titleBarElement.style.display).toBe('none');
    });

    it('should set body and html margins/padding to 0', () => {
      monitor.start();
      vi.advanceTimersByTime(2000);
      
      expect(document.body.style.margin).toBe('0');
      expect(document.body.style.padding).toBe('0');
      expect(document.documentElement.style.margin).toBe('0');
      expect(document.documentElement.style.padding).toBe('0');
    });

    it('should set webkit-app-region to no-drag', () => {
      monitor.start();
      vi.advanceTimersByTime(2000);
      
      expect(document.body.style.webkitAppRegion).toBe('no-drag');
      expect(document.documentElement.style.webkitAppRegion).toBe('no-drag');
    });
  });

  describe('force hiding functionality', () => {
    let monitor: TitleBarMonitor;

    beforeEach(() => {
      monitor = new TitleBarMonitor();
    });

    afterEach(() => {
      monitor.stop();
    });

    it('should call electronAPI.logRendererMessage when forcing hide', () => {
      monitor.start();
      
      // Trigger focus event to force hide
      const focusHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'focus')?.[1] as Function;
      
      if (focusHandler) {
        focusHandler();
        expect(mockElectronAPI.logRendererMessage).toHaveBeenCalledWith(
          'Force titlebar hiding requested from renderer'
        );
      }
    });

    it('should create and inject CSS style for force hiding', () => {
      monitor.start();
      
      // Trigger focus event
      const focusHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'focus')?.[1] as Function;
      
      if (focusHandler) {
        focusHandler();
        
        const injectedStyle = document.getElementById('titlebar-killer');
        expect(injectedStyle).toBeTruthy();
        expect(injectedStyle?.tagName).toBe('STYLE');
      }
    });

    it('should replace existing titlebar-killer style', () => {
      // Create existing style
      const existingStyle = document.createElement('style');
      existingStyle.id = 'titlebar-killer';
      document.head.appendChild(existingStyle);
      
      monitor.start();
      
      // Trigger focus event
      const focusHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'focus')?.[1] as Function;
      
      if (focusHandler) {
        focusHandler();
        
        const styles = document.querySelectorAll('#titlebar-killer');
        expect(styles.length).toBe(1); // Should replace, not duplicate
      }
    });
  });

  describe('periodic logging', () => {
    let monitor: TitleBarMonitor;

    beforeEach(() => {
      monitor = new TitleBarMonitor();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      monitor.stop();
    });

    it('should log periodic status every 60 seconds', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      monitor.start();
      
      // Advance timers to trigger 30 intervals (60 seconds)
      for (let i = 0; i < 30; i++) {
        vi.advanceTimersByTime(2000);
      }
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[TitleBarMonitor] Active for')
      );
    });
  });

  describe('stop() method', () => {
    let monitor: TitleBarMonitor;

    beforeEach(() => {
      monitor = new TitleBarMonitor();
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should stop monitoring when called', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
      
      monitor.start();
      monitor.stop();
      
      expect(consoleSpy).toHaveBeenCalledWith('[TitleBarMonitor] Titlebar monitoring stopped.');
      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not error when stopping already stopped monitor', () => {
      expect(() => {
        monitor.stop();
        monitor.stop(); // Second call should not error
      }).not.toThrow();
    });

    it('should clear interval when stopping', () => {
      const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
      
      monitor.start();
      monitor.stop();
      
      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('event handler edge cases', () => {
    let monitor: TitleBarMonitor;

    beforeEach(() => {
      monitor = new TitleBarMonitor();
    });

    afterEach(() => {
      monitor.stop();
    });

    it('should handle missing electronAPI gracefully', () => {
      (global as any).window.electronAPI = undefined;
      
      expect(() => {
        monitor.start();
        
        // Trigger focus event
        const focusHandler = vi.mocked(window.addEventListener).mock.calls
          .find(call => call[0] === 'focus')?.[1] as Function;
        
        if (focusHandler) {
          focusHandler();
        }
      }).not.toThrow();
    });

    it('should handle elements that are already hidden', () => {
      const element = createMockElement('title');
      element.style.display = 'none';
      
      expect(() => {
        monitor.start();
        vi.useFakeTimers();
        vi.advanceTimersByTime(2000);
        vi.useRealTimers();
      }).not.toThrow();
    });
  });
});