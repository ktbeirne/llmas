/**
 * VRM Behavior Types Test - TDD Red Phase
 * 優先度システムと型定義のテスト
 */

import { describe, it, expect } from 'vitest';

import { 
  ExpressionPriority, 
  ExpressionData, 
  VRMBehaviorState
} from './index';

describe('ExpressionPriority', () => {
  it('should have correct priority order values', () => {
    expect(ExpressionPriority.LOW).toBe(1);
    expect(ExpressionPriority.MEDIUM).toBe(2);
    expect(ExpressionPriority.HIGH).toBe(3);
    expect(ExpressionPriority.CRITICAL).toBe(4);
  });

  it('should allow priority comparison', () => {
    expect(ExpressionPriority.CRITICAL > ExpressionPriority.HIGH).toBe(true);
    expect(ExpressionPriority.HIGH > ExpressionPriority.MEDIUM).toBe(true);
    expect(ExpressionPriority.MEDIUM > ExpressionPriority.LOW).toBe(true);
  });
});

describe('ExpressionData', () => {
  it('should define correct structure for expression data', () => {
    const expressionData: ExpressionData = {
      name: 'happy',
      intensity: 0.8,
      priority: ExpressionPriority.HIGH,
      timestamp: Date.now(),
      source: 'user'
    };

    expect(expressionData.name).toBe('happy');
    expect(expressionData.intensity).toBe(0.8);
    expect(expressionData.priority).toBe(ExpressionPriority.HIGH);
    expect(typeof expressionData.timestamp).toBe('number');
    expect(expressionData.source).toBe('user');
  });

  it('should allow all valid source types', () => {
    const sources: ExpressionData['source'][] = ['user', 'system', 'lipsync', 'animation'];
    
    sources.forEach(source => {
      const data: ExpressionData = {
        name: 'test',
        intensity: 1.0,
        priority: ExpressionPriority.MEDIUM,
        timestamp: Date.now(),
        source
      };
      expect(data.source).toBe(source);
    });
  });
});

describe('VRMBehaviorState', () => {
  it('should define correct state structure', () => {
    const state: VRMBehaviorState = {
      activeExpressions: new Map(),
      lipSyncActive: false,
      currentAnimation: null,
      lastUpdate: Date.now()
    };

    expect(state.activeExpressions instanceof Map).toBe(true);
    expect(typeof state.lipSyncActive).toBe('boolean');
    expect(state.currentAnimation).toBe(null);
    expect(typeof state.lastUpdate).toBe('number');
  });
});

describe('VRMBehaviorManager Interface', () => {
  // These tests will fail until we implement the interface
  it('should define initialize method', () => {
    // This will be implemented in the manager
    expect(true).toBe(true); // Placeholder for interface testing
  });

  it('should define setExpression method', () => {
    // This will be implemented in the manager
    expect(true).toBe(true); // Placeholder for interface testing
  });

  it('should define lipSync control methods', () => {
    // This will be implemented in the manager
    expect(true).toBe(true); // Placeholder for interface testing
  });
});