/**
 * Priority Calculator Test - TDD Red Phase
 * 優先度計算ロジックのテスト
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { 
  ExpressionPriority, 
  ExpressionData 
} from '../types';

import { 
  PriorityCalculator,
  canOverrideExpression,
  resolveExpressionConflict,
  calculateExpressionPriority
} from './priority-calculator';

describe('PriorityCalculator', () => {
  let calculator: PriorityCalculator;

  beforeEach(() => {
    calculator = new PriorityCalculator();
  });

  describe('canOverrideExpression', () => {
    it('should return true when new priority is higher', () => {
      const existing: ExpressionData = {
        name: 'happy',
        intensity: 0.8,
        priority: ExpressionPriority.MEDIUM,
        timestamp: Date.now(),
        source: 'user'
      };

      const result = canOverrideExpression(existing, ExpressionPriority.HIGH);
      expect(result).toBe(true);
    });

    it('should return false when new priority is lower', () => {
      const existing: ExpressionData = {
        name: 'angry',
        intensity: 1.0,
        priority: ExpressionPriority.CRITICAL,
        timestamp: Date.now(),
        source: 'system'
      };

      const result = canOverrideExpression(existing, ExpressionPriority.MEDIUM);
      expect(result).toBe(false);
    });

    it('should return true when priorities are equal but newer timestamp', () => {
      const oldTimestamp = Date.now() - 1000;
      const existing: ExpressionData = {
        name: 'sad',
        intensity: 0.5,
        priority: ExpressionPriority.HIGH,
        timestamp: oldTimestamp,
        source: 'user'
      };

      const result = canOverrideExpression(existing, ExpressionPriority.HIGH, Date.now());
      expect(result).toBe(true);
    });

    it('should return false when priorities are equal and older timestamp', () => {
      const newTimestamp = Date.now();
      const existing: ExpressionData = {
        name: 'surprised',
        intensity: 0.9,
        priority: ExpressionPriority.HIGH,
        timestamp: newTimestamp,
        source: 'animation'
      };

      const result = canOverrideExpression(existing, ExpressionPriority.HIGH, newTimestamp - 500);
      expect(result).toBe(false);
    });
  });

  describe('resolveExpressionConflict', () => {
    it('should return highest priority expression from multiple conflicts', () => {
      const expressions: ExpressionData[] = [
        {
          name: 'happy',
          intensity: 0.8,
          priority: ExpressionPriority.MEDIUM,
          timestamp: Date.now(),
          source: 'user'
        },
        {
          name: 'excited',
          intensity: 1.0,
          priority: ExpressionPriority.CRITICAL,
          timestamp: Date.now(),
          source: 'system'
        },
        {
          name: 'calm',
          intensity: 0.3,
          priority: ExpressionPriority.LOW,
          timestamp: Date.now(),
          source: 'animation'
        }
      ];

      const result = resolveExpressionConflict(expressions);
      expect(result.name).toBe('excited');
      expect(result.priority).toBe(ExpressionPriority.CRITICAL);
    });

    it('should return newest expression when priorities are equal', () => {
      const oldTimestamp = Date.now() - 1000;
      const newTimestamp = Date.now();

      const expressions: ExpressionData[] = [
        {
          name: 'expression1',
          intensity: 0.5,
          priority: ExpressionPriority.HIGH,
          timestamp: oldTimestamp,
          source: 'user'
        },
        {
          name: 'expression2',
          intensity: 0.7,
          priority: ExpressionPriority.HIGH,
          timestamp: newTimestamp,
          source: 'user'
        }
      ];

      const result = resolveExpressionConflict(expressions);
      expect(result.name).toBe('expression2');
      expect(result.timestamp).toBe(newTimestamp);
    });

    it('should throw error when no expressions provided', () => {
      expect(() => resolveExpressionConflict([])).toThrow('No expressions to resolve');
    });
  });

  describe('calculateExpressionPriority', () => {
    it('should calculate correct priority for lipsync source', () => {
      const priority = calculateExpressionPriority('aa', 'lipsync');
      expect(priority).toBe(ExpressionPriority.MEDIUM);
    });

    it('should calculate correct priority for user source', () => {
      const priority = calculateExpressionPriority('happy', 'user');
      expect(priority).toBe(ExpressionPriority.HIGH);
    });

    it('should calculate correct priority for system source', () => {
      const priority = calculateExpressionPriority('function_call_expression', 'system');
      expect(priority).toBe(ExpressionPriority.CRITICAL);
    });

    it('should calculate correct priority for animation source', () => {
      const priority = calculateExpressionPriority('idle_smile', 'animation');
      expect(priority).toBe(ExpressionPriority.LOW);
    });

    it('should handle special case for blink expressions', () => {
      const priority = calculateExpressionPriority('blink', 'system');
      expect(priority).toBe(ExpressionPriority.LOW); // Blink should always be low priority
    });
  });

  describe('PriorityCalculator class', () => {
    it('should correctly rank expressions by priority', () => {
      const expressions = new Map<string, ExpressionData>();
      
      expressions.set('low', {
        name: 'low',
        intensity: 0.5,
        priority: ExpressionPriority.LOW,
        timestamp: Date.now(),
        source: 'animation'
      });

      expressions.set('high', {
        name: 'high',
        intensity: 0.8,
        priority: ExpressionPriority.HIGH,
        timestamp: Date.now(),
        source: 'user'
      });

      const ranking = calculator.rankExpressionsByPriority(expressions);
      expect(ranking[0].name).toBe('high');
      expect(ranking[1].name).toBe('low');
    });

    it('should filter expressions by minimum priority', () => {
      const expressions = new Map<string, ExpressionData>();
      
      expressions.set('low', {
        name: 'low',
        intensity: 0.5,
        priority: ExpressionPriority.LOW,
        timestamp: Date.now(),
        source: 'animation'
      });

      expressions.set('high', {
        name: 'high',
        intensity: 0.8,
        priority: ExpressionPriority.HIGH,
        timestamp: Date.now(),
        source: 'user'
      });

      const filtered = calculator.filterByMinimumPriority(expressions, ExpressionPriority.MEDIUM);
      expect(filtered.size).toBe(1);
      expect(filtered.has('high')).toBe(true);
      expect(filtered.has('low')).toBe(false);
    });
  });
});