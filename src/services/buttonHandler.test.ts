/**
 * ButtonHandler Service Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ButtonHandler, createButtonHandler } from './buttonHandler';

// Mock ElectronAPI
const mockElectronAPI = {
  toggleChatWindowVisibility: vi.fn(),
  onChatWindowStateChanged: vi.fn(),
  toggleSettingsWindow: vi.fn(),
  onSettingsWindowStateChanged: vi.fn(),
  quitApp: vi.fn()
};

// DOM helper functions
const createMockButton = (id: string): HTMLButtonElement => {
  const button = document.createElement('button');
  button.id = id;
  document.body.appendChild(button);
  return button;
};

const setupDOM = () => {
  document.body.innerHTML = '';
  
  return {
    toggleChatButton: createMockButton('toggle-chat-icon'),
    settingsButton: createMockButton('settings-icon'),
    quitAppButton: createMockButton('quit-app-icon')
  };
};

describe('ButtonHandler', () => {
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Mock window.electronAPI
    (global as any).window = {
      ...global.window,
      electronAPI: mockElectronAPI,
      confirm: vi.fn()
    };

    // Mock console methods
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('factory function', () => {
    it('should create ButtonHandler instance', () => {
      const handler = createButtonHandler();
      expect(handler).toBeInstanceOf(ButtonHandler);
    });
  });

  describe('initialization', () => {
    it('should be created successfully', () => {
      const handler = new ButtonHandler();
      expect(handler).toBeDefined();
    });

    it('should setup all button handlers when initialized', () => {
      setupDOM();
      const handler = new ButtonHandler();
      
      expect(() => {
        handler.initialize();
      }).not.toThrow();
    });
  });

  describe('chat toggle button', () => {
    let handler: ButtonHandler;
    let buttons: ReturnType<typeof setupDOM>;

    beforeEach(() => {
      buttons = setupDOM();
      handler = new ButtonHandler();
      handler.initialize();
    });

    it('should call toggleChatWindowVisibility on click', () => {
      buttons.toggleChatButton.click();

      expect(mockElectronAPI.toggleChatWindowVisibility).toHaveBeenCalled();
    });

    it('should handle missing electronAPI gracefully', () => {
      (global as any).window.electronAPI = null;
      
      expect(() => {
        buttons.toggleChatButton.click();
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith('electronAPI.toggleChatWindowVisibility is not available.');
    });

    it('should handle missing toggleChatWindowVisibility method', () => {
      (global as any).window.electronAPI = {};
      
      expect(() => {
        buttons.toggleChatButton.click();
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith('electronAPI.toggleChatWindowVisibility is not available.');
    });

    it('should setup state change listener', () => {
      expect(mockElectronAPI.onChatWindowStateChanged).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should add active class when chat window is visible', () => {
      // Get the callback function passed to onChatWindowStateChanged
      const stateChangeCallback = mockElectronAPI.onChatWindowStateChanged.mock.calls[0][0];
      
      stateChangeCallback(true);

      expect(buttons.toggleChatButton.classList.contains('active')).toBe(true);
    });

    it('should remove active class when chat window is hidden', () => {
      // First add active class
      buttons.toggleChatButton.classList.add('active');
      
      // Get the callback function
      const stateChangeCallback = mockElectronAPI.onChatWindowStateChanged.mock.calls[0][0];
      
      stateChangeCallback(false);

      expect(buttons.toggleChatButton.classList.contains('active')).toBe(false);
    });

    it('should warn when toggle-chat-icon element not found', () => {
      // Remove the button
      buttons.toggleChatButton.remove();
      
      // Create new handler
      const newHandler = new ButtonHandler();
      newHandler.initialize();

      expect(console.warn).toHaveBeenCalledWith('#toggle-chat-icon element not found.');
    });
  });

  describe('settings button', () => {
    let handler: ButtonHandler;
    let buttons: ReturnType<typeof setupDOM>;

    beforeEach(() => {
      buttons = setupDOM();
      handler = new ButtonHandler();
      handler.initialize();
    });

    it('should call toggleSettingsWindow on click', () => {
      buttons.settingsButton.click();

      expect(mockElectronAPI.toggleSettingsWindow).toHaveBeenCalled();
    });

    it('should handle missing electronAPI gracefully', () => {
      (global as any).window.electronAPI = null;
      
      expect(() => {
        buttons.settingsButton.click();
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith('electronAPI.toggleSettingsWindow is not available.');
    });

    it('should handle missing toggleSettingsWindow method', () => {
      (global as any).window.electronAPI = {};
      
      expect(() => {
        buttons.settingsButton.click();
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith('electronAPI.toggleSettingsWindow is not available.');
    });

    it('should setup state change listener', () => {
      expect(mockElectronAPI.onSettingsWindowStateChanged).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should add active class when settings window is open', () => {
      const stateChangeCallback = mockElectronAPI.onSettingsWindowStateChanged.mock.calls[0][0];
      
      stateChangeCallback(true);

      expect(buttons.settingsButton.classList.contains('active')).toBe(true);
    });

    it('should remove active class when settings window is closed', () => {
      // First add active class
      buttons.settingsButton.classList.add('active');
      
      const stateChangeCallback = mockElectronAPI.onSettingsWindowStateChanged.mock.calls[0][0];
      
      stateChangeCallback(false);

      expect(buttons.settingsButton.classList.contains('active')).toBe(false);
    });

    it('should warn when settings-icon element not found', () => {
      buttons.settingsButton.remove();
      
      const newHandler = new ButtonHandler();
      newHandler.initialize();

      expect(console.warn).toHaveBeenCalledWith('#settings-icon element not found.');
    });
  });

  describe('quit app button', () => {
    let handler: ButtonHandler;
    let buttons: ReturnType<typeof setupDOM>;

    beforeEach(() => {
      buttons = setupDOM();
      handler = new ButtonHandler();
      handler.initialize();
    });

    it('should show confirmation dialog and quit when confirmed', () => {
      vi.mocked(window.confirm).mockReturnValue(true);
      
      buttons.quitAppButton.click();

      expect(window.confirm).toHaveBeenCalledWith('本当にアプリケーションを終了しますか？');
      expect(mockElectronAPI.quitApp).toHaveBeenCalled();
    });

    it('should not quit when confirmation is cancelled', () => {
      vi.mocked(window.confirm).mockReturnValue(false);
      
      buttons.quitAppButton.click();

      expect(window.confirm).toHaveBeenCalledWith('本当にアプリケーションを終了しますか？');
      expect(mockElectronAPI.quitApp).not.toHaveBeenCalled();
    });

    it('should handle missing electronAPI gracefully', () => {
      (global as any).window.electronAPI = null;
      vi.mocked(window.confirm).mockReturnValue(true);
      
      expect(() => {
        buttons.quitAppButton.click();
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith('electronAPI.quitApp is not available.');
    });

    it('should handle missing quitApp method', () => {
      (global as any).window.electronAPI = {};
      vi.mocked(window.confirm).mockReturnValue(true);
      
      expect(() => {
        buttons.quitAppButton.click();
      }).not.toThrow();

      expect(console.error).toHaveBeenCalledWith('electronAPI.quitApp is not available.');
    });

    it('should warn when quit-app-icon element not found', () => {
      buttons.quitAppButton.remove();
      
      const newHandler = new ButtonHandler();
      newHandler.initialize();

      expect(console.warn).toHaveBeenCalledWith('#quit-app-icon element not found.');
    });
  });

  describe('multiple initialization', () => {
    it('should handle multiple initialize calls safely', () => {
      setupDOM();
      const handler = new ButtonHandler();
      
      expect(() => {
        handler.initialize();
        handler.initialize(); // Second call
      }).not.toThrow();
    });
  });

  describe('edge cases', () => {
    let handler: ButtonHandler;

    beforeEach(() => {
      handler = new ButtonHandler();
    });

    it('should handle DOM elements that are not buttons', () => {
      // Create div with button ID
      const fakeButton = document.createElement('div');
      fakeButton.id = 'toggle-chat-icon';
      document.body.appendChild(fakeButton);
      
      expect(() => {
        handler.initialize();
      }).not.toThrow();
    });

    it('should handle state change callbacks with missing API methods', () => {
      setupDOM();
      (global as any).window.electronAPI = {
        toggleChatWindowVisibility: vi.fn(),
        // Missing onChatWindowStateChanged
        toggleSettingsWindow: vi.fn(),
        // Missing onSettingsWindowStateChanged
        quitApp: vi.fn()
      };
      
      expect(() => {
        handler.initialize();
      }).not.toThrow();
    });

    it('should handle buttons with existing event listeners', () => {
      const buttons = setupDOM();
      
      // Add existing event listener
      buttons.toggleChatButton.addEventListener('click', () => {});
      
      expect(() => {
        handler.initialize();
      }).not.toThrow();
    });

    it('should handle null window.confirm', () => {
      const buttons = setupDOM();
      (global as any).window.confirm = null;
      
      expect(() => {
        buttons.quitAppButton.click();
      }).toThrow(); // Should throw because confirm is null
    });

    it('should handle undefined window.confirm', () => {
      const buttons = setupDOM();
      (global as any).window.confirm = undefined;
      
      expect(() => {
        buttons.quitAppButton.click();
      }).toThrow(); // Should throw because confirm is undefined
    });
  });

  describe('class list manipulation', () => {
    let buttons: ReturnType<typeof setupDOM>;
    let handler: ButtonHandler;

    beforeEach(() => {
      buttons = setupDOM();
      handler = new ButtonHandler();
      handler.initialize();
    });

    it('should handle elements without classList', () => {
      // Mock element without classList
      const mockElement = {
        addEventListener: vi.fn(),
        classList: null
      };
      
      Object.defineProperty(document, 'getElementById', {
        value: vi.fn().mockReturnValue(mockElement),
        writable: true
      });
      
      expect(() => {
        const newHandler = new ButtonHandler();
        newHandler.initialize();
      }).toThrow(); // Should throw when trying to access classList
    });

    it('should handle classList methods that throw errors', () => {
      // Mock classList that throws
      const mockClassList = {
        add: vi.fn().mockImplementation(() => { throw new Error('Test error'); }),
        remove: vi.fn().mockImplementation(() => { throw new Error('Test error'); }),
        contains: vi.fn().mockReturnValue(false)
      };
      
      Object.defineProperty(buttons.toggleChatButton, 'classList', {
        value: mockClassList,
        writable: true
      });
      
      const stateChangeCallback = mockElectronAPI.onChatWindowStateChanged.mock.calls[0][0];
      
      expect(() => {
        stateChangeCallback(true);
      }).toThrow();
    });
  });
});