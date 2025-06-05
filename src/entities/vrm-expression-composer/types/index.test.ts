/**
 * VRM Expression Composer Types Test - TDD Red Phase
 * 表情合成システムの型定義テスト
 */

import { describe, it, expect } from 'vitest';

import { 
  BlendShapeCategory,
  BlendShapeClassification,
  ExpressionComposition,
  CompositionStrategy,
  ComposedExpression,
  IExpressionComposer
} from './index';

describe('BlendShapeCategory', () => {
  it('should have correct category values', () => {
    expect(BlendShapeCategory.EMOTIONAL).toBe('emotional');
    expect(BlendShapeCategory.MOUTH).toBe('mouth');
    expect(BlendShapeCategory.EYE).toBe('eye');
    expect(BlendShapeCategory.GAZE).toBe('gaze');
    expect(BlendShapeCategory.CUSTOM).toBe('custom');
  });

  it('should allow category comparison', () => {
    expect(BlendShapeCategory.EMOTIONAL).not.toBe(BlendShapeCategory.MOUTH);
    expect(BlendShapeCategory.EYE).not.toBe(BlendShapeCategory.GAZE);
  });
});

describe('BlendShapeClassification', () => {
  it('should define correct structure for BlendShape classification', () => {
    const classification: BlendShapeClassification = {
      category: BlendShapeCategory.EMOTIONAL,
      canCombine: [BlendShapeCategory.MOUTH, BlendShapeCategory.EYE],
      priority: 1
    };

    expect(classification.category).toBe(BlendShapeCategory.EMOTIONAL);
    expect(classification.canCombine).toContain(BlendShapeCategory.MOUTH);
    expect(classification.priority).toBe(1);
  });

  it('should allow all valid categories in canCombine', () => {
    const allCategories = [
      BlendShapeCategory.EMOTIONAL,
      BlendShapeCategory.MOUTH,
      BlendShapeCategory.EYE,
      BlendShapeCategory.GAZE,
      BlendShapeCategory.CUSTOM
    ];

    const classification: BlendShapeClassification = {
      category: BlendShapeCategory.EMOTIONAL,
      canCombine: allCategories,
      priority: 1
    };

    expect(classification.canCombine).toHaveLength(5);
    expect(classification.canCombine).toEqual(allCategories);
  });
});

describe('ExpressionComposition', () => {
  it('should define correct composition structure', () => {
    const composition: ExpressionComposition = {
      emotional: new Map([['happy', 0.8]]),
      mouth: new Map([['aa', 0.5]]),
      eye: new Map([['blink', 0.3]]),
      gaze: new Map([['lookUp', 0.2]]),
      custom: new Map([['special', 1.0]]),
      lastComposed: Date.now()
    };

    expect(composition.emotional instanceof Map).toBe(true);
    expect(composition.mouth instanceof Map).toBe(true);
    expect(composition.eye instanceof Map).toBe(true);
    expect(composition.gaze instanceof Map).toBe(true);
    expect(composition.custom instanceof Map).toBe(true);
    expect(typeof composition.lastComposed).toBe('number');
  });

  it('should allow empty Maps for each category', () => {
    const emptyComposition: ExpressionComposition = {
      emotional: new Map(),
      mouth: new Map(),
      eye: new Map(),
      gaze: new Map(),
      custom: new Map(),
      lastComposed: 0
    };

    expect(emptyComposition.emotional.size).toBe(0);
    expect(emptyComposition.mouth.size).toBe(0);
    expect(emptyComposition.eye.size).toBe(0);
    expect(emptyComposition.gaze.size).toBe(0);
    expect(emptyComposition.custom.size).toBe(0);
  });
});

describe('CompositionStrategy Interface', () => {
  it('should define required strategy properties', () => {
    // Mock implementation for testing interface
    const mockStrategy: CompositionStrategy = {
      name: 'test-strategy',
      combine: (emotional, mouth, eye, gaze) => {
        // Mock implementation
        const result = new Map<string, number>();
        emotional.forEach((value, key) => result.set(key, value));
        mouth.forEach((value, key) => result.set(key, value));
        return result;
      }
    };

    expect(mockStrategy.name).toBe('test-strategy');
    expect(typeof mockStrategy.combine).toBe('function');
  });

  it('should support strategy combination logic', () => {
    const mockStrategy: CompositionStrategy = {
      name: 'additive',
      combine: (emotional, mouth, eye, gaze) => {
        const result = new Map<string, number>();
        
        // Simple additive combination
        emotional.forEach((value, key) => result.set(key, value));
        mouth.forEach((value, key) => result.set(key, value));
        eye.forEach((value, key) => result.set(key, value));
        gaze.forEach((value, key) => result.set(key, value));
        
        return result;
      }
    };

    const emotional = new Map([['happy', 0.8]]);
    const mouth = new Map([['aa', 0.5]]);
    const eye = new Map([['blink', 0.3]]);
    const gaze = new Map([['lookUp', 0.2]]);

    const result = mockStrategy.combine(emotional, mouth, eye, gaze);

    expect(result.get('happy')).toBe(0.8);
    expect(result.get('aa')).toBe(0.5);
    expect(result.get('blink')).toBe(0.3);
    expect(result.get('lookUp')).toBe(0.2);
    expect(result.size).toBe(4);
  });
});

describe('ComposedExpression', () => {
  it('should define correct structure for composed expression result', () => {
    const composedExpression: ComposedExpression = {
      blendShapes: new Map([['happy', 0.8], ['aa', 0.6]]),
      categories: [BlendShapeCategory.EMOTIONAL, BlendShapeCategory.MOUTH],
      timestamp: Date.now()
    };

    expect(composedExpression.blendShapes instanceof Map).toBe(true);
    expect(Array.isArray(composedExpression.categories)).toBe(true);
    expect(typeof composedExpression.timestamp).toBe('number');
    expect(composedExpression.blendShapes.get('happy')).toBe(0.8);
    expect(composedExpression.categories).toContain(BlendShapeCategory.EMOTIONAL);
  });

  it('should allow empty blendShapes and categories', () => {
    const emptyComposedExpression: ComposedExpression = {
      blendShapes: new Map(),
      categories: [],
      timestamp: 0
    };

    expect(emptyComposedExpression.blendShapes.size).toBe(0);
    expect(emptyComposedExpression.categories.length).toBe(0);
    expect(emptyComposedExpression.timestamp).toBe(0);
  });
});

describe('IExpressionComposer Interface', () => {
  it('should define all required methods for expression composer', () => {
    // Mock implementation for testing interface
    const mockComposer: IExpressionComposer = {
      setEmotional: () => {},
      setMouth: () => {},
      setEye: () => {},
      setGaze: () => {},
      compose: () => ({
        blendShapes: new Map(),
        categories: [],
        timestamp: Date.now()
      }),
      applyToVRM: () => {},
      getComposition: () => ({
        emotional: new Map(),
        mouth: new Map(),
        eye: new Map(),
        gaze: new Map(),
        custom: new Map(),
        lastComposed: Date.now()
      }),
      clearCategory: () => {},
      reset: () => {}
    };

    expect(typeof mockComposer.setEmotional).toBe('function');
    expect(typeof mockComposer.setMouth).toBe('function');
    expect(typeof mockComposer.setEye).toBe('function');
    expect(typeof mockComposer.setGaze).toBe('function');
    expect(typeof mockComposer.compose).toBe('function');
    expect(typeof mockComposer.applyToVRM).toBe('function');
    expect(typeof mockComposer.getComposition).toBe('function');
    expect(typeof mockComposer.clearCategory).toBe('function');
    expect(typeof mockComposer.reset).toBe('function');
  });

  it('should support proper method signatures', () => {
    const mockComposer: IExpressionComposer = {
      setEmotional: (name: string, intensity: number) => {
        expect(typeof name).toBe('string');
        expect(typeof intensity).toBe('number');
      },
      setMouth: (shape: string, intensity: number) => {
        expect(typeof shape).toBe('string');
        expect(typeof intensity).toBe('number');
      },
      setEye: (name: string, intensity: number) => {
        expect(typeof name).toBe('string');
        expect(typeof intensity).toBe('number');
      },
      setGaze: (direction: string, intensity: number) => {
        expect(typeof direction).toBe('string');
        expect(typeof intensity).toBe('number');
      },
      compose: () => ({
        blendShapes: new Map([['happy', 0.8]]),
        categories: [BlendShapeCategory.EMOTIONAL],
        timestamp: Date.now()
      }),
      applyToVRM: (vrm: any) => {
        // VRM can be any type
      },
      getComposition: () => ({
        emotional: new Map([['happy', 0.8]]),
        mouth: new Map(),
        eye: new Map(),
        gaze: new Map(),
        custom: new Map(),
        lastComposed: Date.now()
      }),
      clearCategory: (category: BlendShapeCategory) => {
        expect(Object.values(BlendShapeCategory)).toContain(category);
      },
      reset: () => {}
    };

    // Test method calls
    mockComposer.setEmotional('happy', 0.8);
    mockComposer.setMouth('aa', 0.6);
    mockComposer.setEye('blink', 0.4);
    mockComposer.setGaze('lookUp', 0.3);
    
    const composed = mockComposer.compose();
    expect(composed.blendShapes.get('happy')).toBe(0.8);
    
    const composition = mockComposer.getComposition();
    expect(composition.emotional.get('happy')).toBe(0.8);
    
    mockComposer.clearCategory(BlendShapeCategory.EMOTIONAL);
    mockComposer.applyToVRM({});
    mockComposer.reset();
  });
});