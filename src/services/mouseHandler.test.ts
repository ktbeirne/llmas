/**
 * MouseHandler Service Unit Tests
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as THREE from 'three';
import { VRM } from '@pixiv/three-vrm';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MouseHandler, createMouseHandler, MouseHandlerConfig } from './mouseHandler';

// Mock THREE.js objects
const createMockCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  canvas.getBoundingClientRect = vi.fn().mockReturnValue({
    left: 0,
    top: 0,
    width: 800,
    height: 600
  });
  canvas.clientWidth = 800;
  canvas.clientHeight = 600;
  document.body.appendChild(canvas);
  return canvas;
};

const createMockCamera = () => {
  return new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 1000);
};

const createMockControls = (camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement) => {
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false;
  return controls;
};

const createMockVRM = () => {
  const mockScene = new THREE.Group();
  const mockVRM = {
    scene: mockScene,
    humanoid: {
      getBoneNode: vi.fn().mockReturnValue(null)
    },
    lookAt: {
      target: null
    }
  } as unknown as VRM;
  return mockVRM;
};

const createMockSpeechBubble = () => {
  const container = document.createElement('div');
  container.id = 'speech-bubble-container';
  container.style.visibility = 'hidden';
  document.body.appendChild(container);

  const text = document.createElement('p');
  text.id = 'speech-bubble-text';
  container.appendChild(text);

  return { container, text };
};

describe('MouseHandler', () => {
  let canvas: HTMLCanvasElement;
  let camera: THREE.PerspectiveCamera;
  let controls: OrbitControls;
  let raycaster: THREE.Raycaster;
  let mouse: THREE.Vector2;
  let speechBubble: { container: HTMLDivElement; text: HTMLParagraphElement };
  let config: MouseHandlerConfig;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = '';
    
    // Create mock objects
    canvas = createMockCanvas();
    camera = createMockCamera();
    controls = createMockControls(camera, canvas);
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();
    speechBubble = createMockSpeechBubble();

    config = {
      canvasElement: canvas,
      camera,
      controls,
      raycaster,
      mouse,
      speechBubbleContainer: speechBubble.container,
      speechBubbleText: speechBubble.text
    };

    // Mock window methods
    global.window = {
      ...global.window,
      setTimeout: vi.fn((fn, delay) => setTimeout(fn, delay)),
      clearTimeout: vi.fn((id) => clearTimeout(id))
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.clearAllTimers();
  });

  describe('factory function', () => {
    it('should create MouseHandler instance', () => {
      const handler = createMouseHandler(config);
      expect(handler).toBeInstanceOf(MouseHandler);
    });
  });

  describe('initialization', () => {
    it('should be created with correct initial state', () => {
      const handler = new MouseHandler(config);
      expect(handler).toBeDefined();
    });

    it('should setup mouse event listeners', () => {
      const addEventListenerSpy = vi.spyOn(canvas, 'addEventListener');
      new MouseHandler(config);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('mouseleave', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });
  });

  describe('VRM instance management', () => {
    it('should set VRM instance', () => {
      const handler = new MouseHandler(config);
      const mockVRM = createMockVRM();
      
      expect(() => {
        handler.setVRMInstance(mockVRM);
      }).not.toThrow();
    });

    it('should handle null VRM instance', () => {
      const handler = new MouseHandler(config);
      
      expect(() => {
        handler.setVRMInstance(null);
      }).not.toThrow();
    });
  });

  describe('mouse movement handling', () => {
    let handler: MouseHandler;
    let mockVRM: VRM;

    beforeEach(() => {
      handler = new MouseHandler(config);
      mockVRM = createMockVRM();
      handler.setVRMInstance(mockVRM);
    });

    it('should enable controls when mouse is over model', () => {
      // Mock raycaster to return intersection
      vi.spyOn(raycaster, 'intersectObject').mockReturnValue([
        { object: new THREE.Mesh() } as THREE.Intersection
      ]);

      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 400,
        clientY: 300
      });

      canvas.dispatchEvent(mouseMoveEvent);

      expect(controls.enabled).toBe(true);
    });

    it('should disable controls when mouse is not over model', () => {
      // First enable controls
      controls.enabled = true;
      
      // Mock raycaster to return no intersection
      vi.spyOn(raycaster, 'intersectObject').mockReturnValue([]);

      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 400,
        clientY: 300
      });

      canvas.dispatchEvent(mouseMoveEvent);

      expect(controls.enabled).toBe(false);
    });

    it('should update mouse coordinates correctly', () => {
      const intersectSpy = vi.spyOn(raycaster, 'intersectObject').mockReturnValue([]);
      
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 400, // Center of 800px canvas
        clientY: 300  // Center of 600px canvas
      });

      canvas.dispatchEvent(mouseMoveEvent);

      expect(intersectSpy).toHaveBeenCalledWith(mockVRM.scene, true);
      // Mouse coordinates should be normalized to [-1, 1]
      // Center should be (0, 0)
      expect(mouse.x).toBeCloseTo(0, 1);
      expect(mouse.y).toBeCloseTo(0, 1);
    });

    it('should handle mouse movement without VRM instance', () => {
      handler.setVRMInstance(null);
      
      const mouseMoveEvent = new MouseEvent('mousemove', {
        clientX: 400,
        clientY: 300
      });

      expect(() => {
        canvas.dispatchEvent(mouseMoveEvent);
      }).not.toThrow();
    });
  });

  describe('mouse leave handling', () => {
    let handler: MouseHandler;

    beforeEach(() => {
      handler = new MouseHandler(config);
    });

    it('should disable controls when mouse leaves canvas', () => {
      controls.enabled = true;
      
      const mouseLeaveEvent = new MouseEvent('mouseleave');
      canvas.dispatchEvent(mouseLeaveEvent);

      expect(controls.enabled).toBe(false);
    });

    it('should handle mouse leave when controls already disabled', () => {
      controls.enabled = false;
      
      const mouseLeaveEvent = new MouseEvent('mouseleave');
      
      expect(() => {
        canvas.dispatchEvent(mouseLeaveEvent);
      }).not.toThrow();
    });
  });

  describe('click handling', () => {
    let handler: MouseHandler;
    let mockVRM: VRM;

    beforeEach(() => {
      handler = new MouseHandler(config);
      mockVRM = createMockVRM();
      handler.setVRMInstance(mockVRM);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should show speech bubble when model is clicked', () => {
      // Mock raycaster to return intersection
      vi.spyOn(raycaster, 'intersectObject').mockReturnValue([
        { object: new THREE.Mesh() } as THREE.Intersection
      ]);

      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 300
      });

      canvas.dispatchEvent(clickEvent);

      expect(speechBubble.text.textContent).toBe('（きゃっ！触られました…っ）');
      expect(speechBubble.container.style.visibility).toBe('visible');
    });

    it('should hide speech bubble after timeout', () => {
      // Mock raycaster to return intersection
      vi.spyOn(raycaster, 'intersectObject').mockReturnValue([
        { object: new THREE.Mesh() } as THREE.Intersection
      ]);

      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 300
      });

      canvas.dispatchEvent(clickEvent);
      
      // Fast-forward time
      vi.advanceTimersByTime(3000);

      expect(speechBubble.container.style.visibility).toBe('hidden');
    });

    it('should not show speech bubble when background is clicked', () => {
      // Mock raycaster to return no intersection
      vi.spyOn(raycaster, 'intersectObject').mockReturnValue([]);

      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 300
      });

      canvas.dispatchEvent(clickEvent);

      expect(speechBubble.container.style.visibility).toBe('hidden');
    });

    it('should handle click without VRM instance', () => {
      handler.setVRMInstance(null);
      
      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 300
      });

      expect(() => {
        canvas.dispatchEvent(clickEvent);
      }).not.toThrow();
    });

    it('should clear previous speech bubble timeout', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      
      // Mock raycaster to return intersection
      vi.spyOn(raycaster, 'intersectObject').mockReturnValue([
        { object: new THREE.Mesh() } as THREE.Intersection
      ]);

      // First click
      const clickEvent1 = new MouseEvent('click', { clientX: 400, clientY: 300 });
      canvas.dispatchEvent(clickEvent1);
      
      // Second click before timeout
      const clickEvent2 = new MouseEvent('click', { clientX: 400, clientY: 300 });
      canvas.dispatchEvent(clickEvent2);

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('speech bubble management', () => {
    let handler: MouseHandler;

    beforeEach(() => {
      handler = new MouseHandler(config);
    });

    it('should handle missing speech bubble elements gracefully', () => {
      const configWithoutSpeechBubble: MouseHandlerConfig = {
        ...config,
        speechBubbleContainer: undefined,
        speechBubbleText: undefined
      };

      const handlerWithoutSpeechBubble = new MouseHandler(configWithoutSpeechBubble);
      const mockVRM = createMockVRM();
      handlerWithoutSpeechBubble.setVRMInstance(mockVRM);

      // Mock raycaster to return intersection
      vi.spyOn(raycaster, 'intersectObject').mockReturnValue([
        { object: new THREE.Mesh() } as THREE.Intersection
      ]);

      const clickEvent = new MouseEvent('click', {
        clientX: 400,
        clientY: 300
      });

      expect(() => {
        canvas.dispatchEvent(clickEvent);
      }).not.toThrow();
    });
  });

  describe('cleanup', () => {
    let handler: MouseHandler;

    beforeEach(() => {
      handler = new MouseHandler(config);
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should clear timeout on cleanup', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      
      // Trigger a speech bubble to create a timeout
      const mockVRM = createMockVRM();
      handler.setVRMInstance(mockVRM);
      
      vi.spyOn(raycaster, 'intersectObject').mockReturnValue([
        { object: new THREE.Mesh() } as THREE.Intersection
      ]);

      const clickEvent = new MouseEvent('click', { clientX: 400, clientY: 300 });
      canvas.dispatchEvent(clickEvent);

      handler.cleanup();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });

    it('should handle cleanup without active timeout', () => {
      expect(() => {
        handler.cleanup();
      }).not.toThrow();
    });
  });
});