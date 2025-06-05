/**
 * BlendShape Classifier Test - TDD Red Phase
 * BlendShape分類器のテスト
 */

import { describe, it, expect } from 'vitest';

import { BlendShapeCategory } from '../types';
import { 
  BlendShapeClassifier,
  classifyByName,
  getDefaultClassification,
  canCategoriesCombine
} from './blendshape-classifier';

describe('BlendShapeClassifier', () => {
  describe('classifyByName', () => {
    it('should classify emotional expressions correctly', () => {
      expect(classifyByName('happy').category).toBe(BlendShapeCategory.EMOTIONAL);
      expect(classifyByName('sad').category).toBe(BlendShapeCategory.EMOTIONAL);
      expect(classifyByName('angry').category).toBe(BlendShapeCategory.EMOTIONAL);
      expect(classifyByName('surprised').category).toBe(BlendShapeCategory.EMOTIONAL);
      expect(classifyByName('relaxed').category).toBe(BlendShapeCategory.EMOTIONAL);
    });

    it('should classify mouth expressions correctly', () => {
      expect(classifyByName('aa').category).toBe(BlendShapeCategory.MOUTH);
      expect(classifyByName('ih').category).toBe(BlendShapeCategory.MOUTH);
      expect(classifyByName('ou').category).toBe(BlendShapeCategory.MOUTH);
      expect(classifyByName('ee').category).toBe(BlendShapeCategory.MOUTH);
      expect(classifyByName('oh').category).toBe(BlendShapeCategory.MOUTH);
      expect(classifyByName('neutral').category).toBe(BlendShapeCategory.MOUTH);
    });

    it('should classify eye expressions correctly', () => {
      expect(classifyByName('blink').category).toBe(BlendShapeCategory.EYE);
      expect(classifyByName('blinkLeft').category).toBe(BlendShapeCategory.EYE);
      expect(classifyByName('blinkRight').category).toBe(BlendShapeCategory.EYE);
      expect(classifyByName('wink').category).toBe(BlendShapeCategory.EYE);
    });

    it('should classify gaze expressions correctly', () => {
      expect(classifyByName('lookUp').category).toBe(BlendShapeCategory.GAZE);
      expect(classifyByName('lookDown').category).toBe(BlendShapeCategory.GAZE);
      expect(classifyByName('lookLeft').category).toBe(BlendShapeCategory.GAZE);
      expect(classifyByName('lookRight').category).toBe(BlendShapeCategory.GAZE);
    });

    it('should classify unknown expressions as custom', () => {
      expect(classifyByName('unknownExpression').category).toBe(BlendShapeCategory.CUSTOM);
      expect(classifyByName('specialCustom').category).toBe(BlendShapeCategory.CUSTOM);
      expect(classifyByName('').category).toBe(BlendShapeCategory.CUSTOM);
    });

    it('should be case insensitive', () => {
      expect(classifyByName('HAPPY').category).toBe(BlendShapeCategory.EMOTIONAL);
      expect(classifyByName('Happy').category).toBe(BlendShapeCategory.EMOTIONAL);
      expect(classifyByName('AA').category).toBe(BlendShapeCategory.MOUTH);
      expect(classifyByName('BLINK').category).toBe(BlendShapeCategory.EYE);
    });

    it('should set correct priorities for same category', () => {
      const happy = classifyByName('happy');
      const sad = classifyByName('sad');
      
      expect(happy.priority).toBeGreaterThan(0);
      expect(sad.priority).toBeGreaterThan(0);
      expect(typeof happy.priority).toBe('number');
      expect(typeof sad.priority).toBe('number');
    });

    it('should set correct combinable categories', () => {
      const emotional = classifyByName('happy');
      const mouth = classifyByName('aa');
      const eye = classifyByName('blink');
      
      // Emotional should combine with mouth and eye
      expect(emotional.canCombine).toContain(BlendShapeCategory.MOUTH);
      expect(emotional.canCombine).toContain(BlendShapeCategory.EYE);
      
      // Mouth should combine with emotional and eye
      expect(mouth.canCombine).toContain(BlendShapeCategory.EMOTIONAL);
      expect(mouth.canCombine).toContain(BlendShapeCategory.EYE);
      
      // Eye should combine with emotional and mouth
      expect(eye.canCombine).toContain(BlendShapeCategory.EMOTIONAL);
      expect(eye.canCombine).toContain(BlendShapeCategory.MOUTH);
    });
  });

  describe('getDefaultClassification', () => {
    it('should return appropriate defaults for each category', () => {
      const emotionalDefault = getDefaultClassification(BlendShapeCategory.EMOTIONAL);
      expect(emotionalDefault.category).toBe(BlendShapeCategory.EMOTIONAL);
      expect(emotionalDefault.canCombine.length).toBeGreaterThan(0);
      expect(emotionalDefault.priority).toBeGreaterThan(0);

      const mouthDefault = getDefaultClassification(BlendShapeCategory.MOUTH);
      expect(mouthDefault.category).toBe(BlendShapeCategory.MOUTH);
      expect(mouthDefault.canCombine.length).toBeGreaterThan(0);

      const eyeDefault = getDefaultClassification(BlendShapeCategory.EYE);
      expect(eyeDefault.category).toBe(BlendShapeCategory.EYE);
      expect(eyeDefault.canCombine.length).toBeGreaterThan(0);

      const gazeDefault = getDefaultClassification(BlendShapeCategory.GAZE);
      expect(gazeDefault.category).toBe(BlendShapeCategory.GAZE);
      expect(gazeDefault.canCombine.length).toBeGreaterThan(0);

      const customDefault = getDefaultClassification(BlendShapeCategory.CUSTOM);
      expect(customDefault.category).toBe(BlendShapeCategory.CUSTOM);
    });
  });

  describe('canCategoriesCombine', () => {
    it('should return true for combinable categories', () => {
      expect(canCategoriesCombine(BlendShapeCategory.EMOTIONAL, BlendShapeCategory.MOUTH)).toBe(true);
      expect(canCategoriesCombine(BlendShapeCategory.EMOTIONAL, BlendShapeCategory.EYE)).toBe(true);
      expect(canCategoriesCombine(BlendShapeCategory.MOUTH, BlendShapeCategory.EYE)).toBe(true);
      expect(canCategoriesCombine(BlendShapeCategory.MOUTH, BlendShapeCategory.EMOTIONAL)).toBe(true);
    });

    it('should return false for non-combinable categories', () => {
      // Same category should not combine with itself
      expect(canCategoriesCombine(BlendShapeCategory.EMOTIONAL, BlendShapeCategory.EMOTIONAL)).toBe(false);
      expect(canCategoriesCombine(BlendShapeCategory.MOUTH, BlendShapeCategory.MOUTH)).toBe(false);
      expect(canCategoriesCombine(BlendShapeCategory.EYE, BlendShapeCategory.EYE)).toBe(false);
    });

    it('should handle gaze category correctly', () => {
      // Gaze might have specific combination rules
      expect(canCategoriesCombine(BlendShapeCategory.GAZE, BlendShapeCategory.EMOTIONAL)).toBe(true);
      expect(canCategoriesCombine(BlendShapeCategory.GAZE, BlendShapeCategory.MOUTH)).toBe(true);
    });

    it('should handle custom category correctly', () => {
      expect(canCategoriesCombine(BlendShapeCategory.CUSTOM, BlendShapeCategory.EMOTIONAL)).toBe(true);
      expect(canCategoriesCombine(BlendShapeCategory.CUSTOM, BlendShapeCategory.MOUTH)).toBe(true);
      expect(canCategoriesCombine(BlendShapeCategory.CUSTOM, BlendShapeCategory.EYE)).toBe(true);
    });
  });

  describe('BlendShapeClassifier class', () => {
    let classifier: BlendShapeClassifier;

    beforeEach(() => {
      classifier = new BlendShapeClassifier();
    });

    it('should classify expressions consistently', () => {
      const result1 = classifier.classify('happy');
      const result2 = classifier.classify('happy');
      
      expect(result1.category).toBe(result2.category);
      expect(result1.priority).toBe(result2.priority);
      expect(result1.canCombine).toEqual(result2.canCombine);
    });

    it('should support custom classification registration', () => {
      const customClassification = {
        category: BlendShapeCategory.CUSTOM,
        canCombine: [BlendShapeCategory.EMOTIONAL],
        priority: 5
      };

      classifier.registerCustom('myCustomExpression', customClassification);
      
      const result = classifier.classify('myCustomExpression');
      expect(result.category).toBe(BlendShapeCategory.CUSTOM);
      expect(result.priority).toBe(5);
      expect(result.canCombine).toEqual([BlendShapeCategory.EMOTIONAL]);
    });

    it('should get all expressions by category', () => {
      const emotionalExpressions = classifier.getExpressionsByCategory(BlendShapeCategory.EMOTIONAL);
      
      expect(emotionalExpressions).toContain('happy');
      expect(emotionalExpressions).toContain('sad');
      expect(emotionalExpressions).toContain('angry');
      expect(emotionalExpressions.length).toBeGreaterThan(0);
    });

    it('should validate category combinations', () => {
      expect(classifier.canCombine(BlendShapeCategory.EMOTIONAL, BlendShapeCategory.MOUTH)).toBe(true);
      expect(classifier.canCombine(BlendShapeCategory.EMOTIONAL, BlendShapeCategory.EMOTIONAL)).toBe(false);
    });
  });
});