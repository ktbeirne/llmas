/**
 * MainRenderer Integration Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock all service modules
vi.mock('./services/titleBarMonitor', () => ({
  createTitleBarMonitor: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn()
  }))
}));

vi.mock('./services/mouseHandler', () => ({
  createMouseHandler: vi.fn(() => ({
    setVRMInstance: vi.fn(),
    cleanup: vi.fn()
  }))
}));

vi.mock('./services/cameraManager', () => ({
  createCameraManager: vi.fn(() => ({
    restoreCameraSettings: vi.fn().mockResolvedValue(undefined),
    saveCameraSettings: vi.fn().mockResolvedValue(undefined),
    updateWindowSize: vi.fn(),
    cleanup: vi.fn()
  }))
}));

vi.mock('./services/buttonHandler', () => ({
  createButtonHandler: vi.fn(() => ({
    initialize: vi.fn()
  }))
}));

vi.mock('./services/vrmGlobalHandler', () => ({
  createVRMGlobalHandler: vi.fn(() => ({
    initialize: vi.fn()
  }))
}));

vi.mock('./services/renderManager', () => ({
  createRenderManager: vi.fn(() => ({
    startAnimationLoop: vi.fn(),
    cleanup: vi.fn()
  }))
}));

vi.mock('./services/vrmSetupManager', () => ({
  createVRMSetupManager: vi.fn(() => ({
    initializeVRM: vi.fn().mockResolvedValue(undefined),
    getLoadedVRM: vi.fn().mockReturnValue(null)
  }))
}));

// Mock THREE.js
vi.mock('three', () => ({
  Scene: vi.fn(() => ({})),
  PerspectiveCamera: vi.fn(() => ({
    position: { set: vi.fn() },
    updateProjectionMatrix: vi.fn()
  })),
  WebGLRenderer: vi.fn(() => ({
    setSize: vi.fn(),
    setPixelRatio: vi.fn(),
    setClearColor: vi.fn(),
    shadowMap: { enabled: false }
  })),
  DirectionalLight: vi.fn(() => ({
    position: { set: vi.fn().mockReturnThis(), normalize: vi.fn() }
  })),
  AmbientLight: vi.fn(() => ({})),
  Raycaster: vi.fn(() => ({})),
  Vector2: vi.fn(() => ({}))
}));

vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: vi.fn(() => ({
    enabled: false,
    target: { set: vi.fn() },
    update: vi.fn()
  }))
}));

// Mock CSS import
vi.mock('./index.css', () => ({}));

describe('MainRenderer Integration', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockCanvasArea: HTMLDivElement;
  let mockSpeechBubbleContainer: HTMLDivElement;
  let mockSpeechBubbleText: HTMLParagraphElement;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Create mock DOM elements
    mockCanvas = document.createElement('canvas');
    mockCanvas.id = 'vrm-canvas';
    mockCanvas.width = 800;
    mockCanvas.height = 600;
    document.body.appendChild(mockCanvas);

    mockCanvasArea = document.createElement('div');
    mockCanvasArea.id = 'canvas-area';
    mockCanvasArea.style.width = '800px';
    mockCanvasArea.style.height = '600px';
    Object.defineProperty(mockCanvasArea, 'clientWidth', { value: 800 });
    Object.defineProperty(mockCanvasArea, 'clientHeight', { value: 600 });
    document.body.appendChild(mockCanvasArea);

    mockSpeechBubbleContainer = document.createElement('div');
    mockSpeechBubbleContainer.id = 'speech-bubble-container';
    document.body.appendChild(mockSpeechBubbleContainer);

    mockSpeechBubbleText = document.createElement('p');
    mockSpeechBubbleText.id = 'speech-bubble-text';
    mockSpeechBubbleContainer.appendChild(mockSpeechBubbleText);

    // Mock window methods
    (global as any).window = {
      ...global.window,
      devicePixelRatio: 1,
      innerWidth: 800,
      innerHeight: 600,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    };

    // Mock document methods
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');

    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  describe('MainRenderer initialization', () => {
    it('should initialize without errors when all DOM elements are present', async () => {
      expect(() => {
        // Import MainRenderer - this will trigger initialization
        require('./mainRenderer');
      }).not.toThrow();
    });

    it('should handle missing vrm-canvas element gracefully', async () => {
      mockCanvas.remove();

      expect(() => {
        // Clear module cache and re-import
        delete require.cache[require.resolve('./mainRenderer')];
        require('./mainRenderer');
      }).toThrow(); // Should throw because canvas is required
    });

    it('should handle missing canvas-area element gracefully', async () => {
      mockCanvasArea.remove();

      expect(() => {
        delete require.cache[require.resolve('./mainRenderer')];
        require('./mainRenderer');
      }).not.toThrow(); // Should handle missing canvas-area gracefully
    });

    it('should handle missing speech bubble elements gracefully', async () => {
      mockSpeechBubbleContainer.remove();
      mockSpeechBubbleText.remove();

      expect(() => {
        delete require.cache[require.resolve('./mainRenderer')];
        require('./mainRenderer');
      }).not.toThrow(); // Should handle missing speech bubble elements gracefully
    });
  });

  describe('Service initialization', () => {
    it('should create all required services', async () => {
      const {
        createTitleBarMonitor,
        createMouseHandler,
        createCameraManager,
        createButtonHandler,
        createVRMGlobalHandler,
        createRenderManager,
        createVRMSetupManager
      } = await import('./services/titleBarMonitor');

      delete require.cache[require.resolve('./mainRenderer')];
      require('./mainRenderer');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(createTitleBarMonitor).toHaveBeenCalled();
    });

    it('should start all services correctly', async () => {
      const mockServices = {
        titleBarMonitor: { start: vi.fn(), stop: vi.fn() },
        buttonHandler: { initialize: vi.fn() },
        vrmGlobalHandler: { initialize: vi.fn() },
        renderManager: { startAnimationLoop: vi.fn(), cleanup: vi.fn() },
        vrmSetupManager: { initializeVRM: vi.fn().mockResolvedValue(undefined), getLoadedVRM: vi.fn() }
      };

      // Update mocks to return our test objects
      vi.mocked(require('./services/titleBarMonitor').createTitleBarMonitor).mockReturnValue(mockServices.titleBarMonitor);
      vi.mocked(require('./services/buttonHandler').createButtonHandler).mockReturnValue(mockServices.buttonHandler);
      vi.mocked(require('./services/vrmGlobalHandler').createVRMGlobalHandler).mockReturnValue(mockServices.vrmGlobalHandler);
      vi.mocked(require('./services/renderManager').createRenderManager).mockReturnValue(mockServices.renderManager);
      vi.mocked(require('./services/vrmSetupManager').createVRMSetupManager).mockReturnValue(mockServices.vrmSetupManager);

      delete require.cache[require.resolve('./mainRenderer')];
      require('./mainRenderer');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockServices.titleBarMonitor.start).toHaveBeenCalled();
      expect(mockServices.buttonHandler.initialize).toHaveBeenCalled();
      expect(mockServices.vrmGlobalHandler.initialize).toHaveBeenCalled();
      expect(mockServices.renderManager.startAnimationLoop).toHaveBeenCalled();
    });
  });

  describe('Event listener setup', () => {
    it('should setup beforeunload event listener', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');

      delete require.cache[require.resolve('./mainRenderer')];
      require('./mainRenderer');

      expect(addEventListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    });

    it('should setup DOMContentLoaded listener when document is loading', async () => {
      vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
      const addEventListenerSpy = vi.spyOn(document, 'addEventListener');

      delete require.cache[require.resolve('./mainRenderer')];
      require('./mainRenderer');

      expect(addEventListenerSpy).toHaveBeenCalledWith('DOMContentLoaded', expect.any(Function));
    });

    it('should call camera restore immediately when document is ready', async () => {
      vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
      
      const mockCameraManager = {
        restoreCameraSettings: vi.fn().mockResolvedValue(undefined),
        saveCameraSettings: vi.fn(),
        updateWindowSize: vi.fn(),
        cleanup: vi.fn()
      };

      vi.mocked(require('./services/cameraManager').createCameraManager).mockReturnValue(mockCameraManager);

      delete require.cache[require.resolve('./mainRenderer')];
      require('./mainRenderer');

      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 0));

      expect(mockCameraManager.restoreCameraSettings).toHaveBeenCalled();
    });
  });

  describe('VRM integration', () => {
    it('should setup mouse handler with loaded VRM', async () => {
      const mockVRM = { scene: {}, humanoid: {} };
      const mockMouseHandler = { setVRMInstance: vi.fn(), cleanup: vi.fn() };
      const mockVRMSetupManager = {
        initializeVRM: vi.fn().mockResolvedValue(undefined),
        getLoadedVRM: vi.fn().mockReturnValue(mockVRM)
      };

      vi.mocked(require('./services/mouseHandler').createMouseHandler).mockReturnValue(mockMouseHandler);
      vi.mocked(require('./services/vrmSetupManager').createVRMSetupManager).mockReturnValue(mockVRMSetupManager);

      delete require.cache[require.resolve('./mainRenderer')];
      require('./mainRenderer');

      // Wait for VRM initialization
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockVRMSetupManager.initializeVRM).toHaveBeenCalled();
      expect(mockMouseHandler.setVRMInstance).toHaveBeenCalledWith(mockVRM);
    });

    it('should handle VRM initialization failure gracefully', async () => {
      const mockMouseHandler = { setVRMInstance: vi.fn(), cleanup: vi.fn() };
      const mockVRMSetupManager = {
        initializeVRM: vi.fn().mockRejectedValue(new Error('VRM load failed')),
        getLoadedVRM: vi.fn().mockReturnValue(null)
      };

      vi.mocked(require('./services/mouseHandler').createMouseHandler).mockReturnValue(mockMouseHandler);
      vi.mocked(require('./services/vrmSetupManager').createVRMSetupManager).mockReturnValue(mockVRMSetupManager);

      delete require.cache[require.resolve('./mainRenderer')];
      
      expect(() => {
        require('./mainRenderer');
      }).not.toThrow();
    });
  });

  describe('cleanup functionality', () => {
    it('should cleanup all services on beforeunload', async () => {
      const mockServices = {
        cameraManager: { 
          restoreCameraSettings: vi.fn(),
          saveCameraSettings: vi.fn(), 
          cleanup: vi.fn() 
        },
        mouseHandler: { setVRMInstance: vi.fn(), cleanup: vi.fn() },
        renderManager: { startAnimationLoop: vi.fn(), cleanup: vi.fn() },
        titleBarMonitor: { start: vi.fn(), stop: vi.fn() }
      };

      vi.mocked(require('./services/cameraManager').createCameraManager).mockReturnValue(mockServices.cameraManager);
      vi.mocked(require('./services/mouseHandler').createMouseHandler).mockReturnValue(mockServices.mouseHandler);
      vi.mocked(require('./services/renderManager').createRenderManager).mockReturnValue(mockServices.renderManager);
      vi.mocked(require('./services/titleBarMonitor').createTitleBarMonitor).mockReturnValue(mockServices.titleBarMonitor);

      delete require.cache[require.resolve('./mainRenderer')];
      require('./mainRenderer');

      // Find and trigger the beforeunload handler
      const beforeunloadHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'beforeunload')?.[1] as Function;

      if (beforeunloadHandler) {
        beforeunloadHandler();

        expect(mockServices.cameraManager.saveCameraSettings).toHaveBeenCalled();
        expect(mockServices.cameraManager.cleanup).toHaveBeenCalled();
        expect(mockServices.mouseHandler.cleanup).toHaveBeenCalled();
        expect(mockServices.renderManager.cleanup).toHaveBeenCalled();
        expect(mockServices.titleBarMonitor.stop).toHaveBeenCalled();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle canvas with zero dimensions', async () => {
      Object.defineProperty(mockCanvasArea, 'clientWidth', { value: 0 });
      Object.defineProperty(mockCanvasArea, 'clientHeight', { value: 0 });

      expect(() => {
        delete require.cache[require.resolve('./mainRenderer')];
        require('./mainRenderer');
      }).not.toThrow();
    });

    it('should handle missing canvas area dimensions', async () => {
      Object.defineProperty(mockCanvasArea, 'clientWidth', { value: undefined });
      Object.defineProperty(mockCanvasArea, 'clientHeight', { value: undefined });

      expect(() => {
        delete require.cache[require.resolve('./mainRenderer')];
        require('./mainRenderer');
      }).not.toThrow();
    });

    it('should handle renderer creation failure', async () => {
      // Mock WebGLRenderer to throw
      vi.mocked(require('three').WebGLRenderer).mockImplementation(() => {
        throw new Error('WebGL not supported');
      });

      expect(() => {
        delete require.cache[require.resolve('./mainRenderer')];
        require('./mainRenderer');
      }).toThrow('WebGL not supported');
    });

    it('should handle service creation failures gracefully', async () => {
      vi.mocked(require('./services/titleBarMonitor').createTitleBarMonitor).mockImplementation(() => {
        throw new Error('Service creation failed');
      });

      expect(() => {
        delete require.cache[require.resolve('./mainRenderer')];
        require('./mainRenderer');
      }).toThrow('Service creation failed');
    });
  });

  describe('performance considerations', () => {
    it('should not create multiple instances when imported multiple times', async () => {
      const createTitleBarMonitorSpy = vi.mocked(require('./services/titleBarMonitor').createTitleBarMonitor);

      // First import
      delete require.cache[require.resolve('./mainRenderer')];
      require('./mainRenderer');

      const firstCallCount = createTitleBarMonitorSpy.mock.calls.length;

      // Second import (should use cached module)
      require('./mainRenderer');

      expect(createTitleBarMonitorSpy.mock.calls.length).toBe(firstCallCount);
    });

    it('should handle rapid event triggers without issues', async () => {
      delete require.cache[require.resolve('./mainRenderer')];
      require('./mainRenderer');

      // Trigger multiple beforeunload events rapidly
      const beforeunloadHandler = vi.mocked(window.addEventListener).mock.calls
        .find(call => call[0] === 'beforeunload')?.[1] as Function;

      if (beforeunloadHandler) {
        for (let i = 0; i < 10; i++) {
          expect(() => beforeunloadHandler()).not.toThrow();
        }
      }
    });
  });
});