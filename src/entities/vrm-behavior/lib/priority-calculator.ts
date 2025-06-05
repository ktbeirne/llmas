/**
 * Priority Calculator - FSD Entities Layer
 * 表情優先度計算ロジック
 */

import { ExpressionPriority, ExpressionData } from '../types';

/**
 * 既存の表情を新しい表情で上書きできるかチェック
 */
export function canOverrideExpression(
  existing: ExpressionData, 
  newPriority: ExpressionPriority, 
  newTimestamp?: number
): boolean {
  // 優先度が高い場合は上書き可能
  if (newPriority > existing.priority) {
    return true;
  }
  
  // 優先度が低い場合は上書き不可
  if (newPriority < existing.priority) {
    return false;
  }
  
  // 優先度が同じ場合はタイムスタンプで判定
  const currentTimestamp = newTimestamp || Date.now();
  return currentTimestamp > existing.timestamp;
}

/**
 * 複数の表情競合を解決して最優先表情を決定
 */
export function resolveExpressionConflict(expressions: ExpressionData[]): ExpressionData {
  if (expressions.length === 0) {
    throw new Error('No expressions to resolve');
  }
  
  // 最高優先度を見つける
  const maxPriority = Math.max(...expressions.map(expr => expr.priority));
  
  // 最高優先度の表情をフィルタリング
  const highestPriorityExpressions = expressions.filter(expr => expr.priority === maxPriority);
  
  // 最高優先度が複数ある場合は最新のタイムスタンプを選択
  return highestPriorityExpressions.reduce((latest, current) => 
    current.timestamp > latest.timestamp ? current : latest
  );
}

/**
 * 表情名とソースから優先度を自動計算
 */
export function calculateExpressionPriority(
  expressionName: string, 
  source: ExpressionData['source']
): ExpressionPriority {
  // blink系は常に低優先度
  if (expressionName.toLowerCase().includes('blink')) {
    return ExpressionPriority.LOW;
  }
  
  // ソース別の基本優先度
  switch (source) {
    case 'lipsync':
      return ExpressionPriority.MEDIUM;
    case 'user':
      return ExpressionPriority.HIGH;
    case 'system':
      // システム表情（Function Call等）は最高優先度
      return ExpressionPriority.CRITICAL;
    case 'animation':
      return ExpressionPriority.LOW;
    default:
      return ExpressionPriority.MEDIUM;
  }
}

/**
 * 優先度計算の主要クラス
 */
export class PriorityCalculator {
  /**
   * 表情を優先度順にランキング
   */
  rankExpressionsByPriority(expressions: Map<string, ExpressionData>): ExpressionData[] {
    const expressionArray = Array.from(expressions.values());
    
    // 優先度の高い順、同じ優先度なら新しい順にソート
    return expressionArray.sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // 高い優先度が先
      }
      return b.timestamp - a.timestamp; // 新しいタイムスタンプが先
    });
  }

  /**
   * 最小優先度でフィルタリング
   */
  filterByMinimumPriority(
    expressions: Map<string, ExpressionData>, 
    minPriority: ExpressionPriority
  ): Map<string, ExpressionData> {
    const filtered = new Map<string, ExpressionData>();
    
    for (const [name, expression] of expressions) {
      if (expression.priority >= minPriority) {
        filtered.set(name, expression);
      }
    }
    
    return filtered;
  }
}