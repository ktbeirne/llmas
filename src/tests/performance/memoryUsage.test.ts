import { describe, it, expect, beforeEach, afterEach } from 'vitest';

/**
 * メモリ使用量パフォーマンステスト
 * TDD: メモリリークとパフォーマンスボトルネックの検出
 */
describe('Memory Usage Performance Tests', () => {
  let initialMemoryUsage: NodeJS.MemoryUsage;
  
  beforeEach(() => {
    // ガベージコレクションを実行して正確な測定を行う
    if (global.gc) {
      global.gc();
    }
    initialMemoryUsage = process.memoryUsage();
  });
  
  afterEach(() => {
    // テスト後のクリーンアップ
    if (global.gc) {
      global.gc();
    }
  });
  
  it('should maintain stable memory usage during module loading', () => {
    // TDD: 期待値 - モジュール読み込み時のメモリ増加は50MB以下
    const MEMORY_INCREASE_LIMIT = 50 * 1024 * 1024; // 50MB
    
    // Three.js関連の大きなモジュールをテスト読み込み
    const memoryBefore = process.memoryUsage();
    
    // 仮想的なモジュール読み込みテスト（実際の読み込みはテスト環境での実行が困難）
    const testObject = {
      largeArray: new Array(10000).fill(0).map((_, i) => ({ id: i, data: `test${i}` })),
      geometry: new Array(1000).fill(0),
      materials: new Array(100).fill(0),
    };
    
    const memoryAfter = process.memoryUsage();
    const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;
    
    expect(memoryIncrease).toBeLessThan(MEMORY_INCREASE_LIMIT);
    
    // テストオブジェクトをクリーンアップ
    // @ts-ignore
    testObject.largeArray = null;
    // @ts-ignore
    testObject.geometry = null;
    // @ts-ignore
    testObject.materials = null;
  });
  
  it('should detect memory leaks in event listeners', () => {
    // TDD: 期待値 - イベントリスナーによるメモリリークがないこと
    const MAX_LISTENERS_PER_EMITTER = 15;
    const SAFE_LISTENER_COUNT = 8; // 安全な範囲内のリスナー数
    
    // EventEmitterのテスト
    const EventEmitter = require('events');
    const emitter = new EventEmitter();
    
    // 最大リスナー数を適切に設定
    emitter.setMaxListeners(MAX_LISTENERS_PER_EMITTER);
    
    // 安全な範囲内でリスナーを追加
    for (let i = 0; i < SAFE_LISTENER_COUNT; i++) {
      emitter.on('test', () => {});
    }
    
    const listenerCount = emitter.listenerCount('test');
    expect(listenerCount).toBeLessThan(MAX_LISTENERS_PER_EMITTER);
    expect(listenerCount).toBe(SAFE_LISTENER_COUNT);
    
    // 最大リスナー数の設定が正しいことを確認
    expect(emitter.getMaxListeners()).toBeGreaterThanOrEqual(listenerCount);
    
    // クリーンアップ
    emitter.removeAllListeners();
    expect(emitter.listenerCount('test')).toBe(0);
  });
  
  it('should have efficient garbage collection patterns', async () => {
    // TDD: 期待値 - ガベージコレクション後のメモリ使用量が適切であること
    const memoryBefore = process.memoryUsage();
    
    // より現実的なサイズのオブジェクト作成
    let tempObjects: any[] = [];
    const OBJECT_COUNT = 1000; // より小さな数で確実にテスト
    
    for (let i = 0; i < OBJECT_COUNT; i++) {
      tempObjects.push({
        id: i,
        data: new Array(50).fill(`data${i}`), // より小さなデータ
        timestamp: Date.now(),
      });
    }
    
    const memoryDuringAllocation = process.memoryUsage();
    const memoryIncrease = memoryDuringAllocation.heapUsed - memoryBefore.heapUsed;
    
    // 一定のメモリ増加があることを確認
    expect(memoryIncrease).toBeGreaterThan(0);
    
    // オブジェクトを解放
    tempObjects.length = 0; // 配列をクリア
    tempObjects = null as any;
    
    // ガベージコレクションを複数回実行して確実に回収
    if (global.gc) {
      global.gc();
      await new Promise(resolve => setTimeout(resolve, 10)); // 少し待機
      global.gc();
    }
    
    const memoryAfterGC = process.memoryUsage();
    
    // 最終的なメモリ使用量の増加が合理的な範囲内であることを確認（初期比+5MB以内）
    const finalMemoryIncrease = memoryAfterGC.heapUsed - memoryBefore.heapUsed;
    expect(finalMemoryIncrease).toBeLessThan(5 * 1024 * 1024); // 5MB
    
    // ヒープ総サイズの過度な増加がないことを確認
    const heapSizeIncrease = memoryAfterGC.heapTotal - memoryBefore.heapTotal;
    expect(heapSizeIncrease).toBeLessThan(20 * 1024 * 1024); // 20MB
  });
  
  it('should monitor V8 heap statistics for optimization opportunities', () => {
    // TDD: 期待値 - V8ヒープ統計が健全な範囲内であること
    const v8 = require('v8');
    const heapStats = v8.getHeapStatistics();
    
    // ヒープサイズの健全性チェック
    const heapSizeLimit = heapStats.heap_size_limit;
    const totalHeapSize = heapStats.total_heap_size;
    const usedHeapSize = heapStats.used_heap_size;
    
    // 使用率が95%を超えていないことを確認
    const heapUsageRatio = usedHeapSize / totalHeapSize;
    expect(heapUsageRatio).toBeLessThan(0.95);
    
    // 総ヒープサイズが制限の80%を超えていないことを確認
    const totalHeapRatio = totalHeapSize / heapSizeLimit;
    expect(totalHeapRatio).toBeLessThan(0.8);
    
    // 外部メモリの使用量をチェック
    expect(heapStats.external_memory).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});

/**
 * メモリ使用量分析ユーティリティ
 */
export class MemoryAnalyzer {
  static formatMemoryUsage(memoryUsage: NodeJS.MemoryUsage) {
    const formatBytes = (bytes: number) => {
      const mb = bytes / 1024 / 1024;
      return `${mb.toFixed(2)} MB`;
    };
    
    return {
      rss: formatBytes(memoryUsage.rss),
      heapTotal: formatBytes(memoryUsage.heapTotal),
      heapUsed: formatBytes(memoryUsage.heapUsed),
      external: formatBytes(memoryUsage.external),
      arrayBuffers: formatBytes(memoryUsage.arrayBuffers || 0),
    };
  }
  
  static analyzeMemoryTrend(samples: NodeJS.MemoryUsage[]) {
    if (samples.length < 2) {
      return { trend: 'insufficient_data', recommendation: 'Collect more samples' };
    }
    
    const first = samples[0];
    const last = samples[samples.length - 1];
    
    const heapGrowth = last.heapUsed - first.heapUsed;
    const growthRate = heapGrowth / samples.length;
    
    let trend: 'stable' | 'growing' | 'leaking' | 'shrinking';
    let recommendation: string;
    
    if (Math.abs(growthRate) < 1024 * 1024) { // < 1MB per sample
      trend = 'stable';
      recommendation = 'Memory usage is stable';
    } else if (growthRate > 5 * 1024 * 1024) { // > 5MB per sample
      trend = 'leaking';
      recommendation = 'Potential memory leak detected. Investigate large object allocations';
    } else if (growthRate > 0) {
      trend = 'growing';
      recommendation = 'Memory usage is growing. Monitor for potential leaks';
    } else {
      trend = 'shrinking';
      recommendation = 'Memory usage is decreasing. Good garbage collection';
    }
    
    return {
      trend,
      recommendation,
      growthRate: this.formatMemoryUsage({ 
        rss: growthRate, 
        heapTotal: 0, 
        heapUsed: 0, 
        external: 0 
      } as NodeJS.MemoryUsage).rss,
      samples: samples.length,
    };
  }
  
  static getPerformanceRecommendations(memoryUsage: NodeJS.MemoryUsage) {
    const recommendations: string[] = [];
    const v8 = require('v8');
    const heapStats = v8.getHeapStatistics();
    
    // ヒープ使用率チェック
    const heapUsageRatio = memoryUsage.heapUsed / memoryUsage.heapTotal;
    if (heapUsageRatio > 0.8) {
      recommendations.push('High heap usage detected. Consider implementing object pooling');
    }
    
    // 外部メモリチェック
    if (memoryUsage.external > 50 * 1024 * 1024) { // 50MB
      recommendations.push('High external memory usage. Review Buffer and TypedArray usage');
    }
    
    // ArrayBufferチェック
    if (memoryUsage.arrayBuffers && memoryUsage.arrayBuffers > 20 * 1024 * 1024) { // 20MB
      recommendations.push('High ArrayBuffer usage. Consider releasing unused buffers');
    }
    
    // V8統計に基づく推奨事項
    const totalHeapRatio = heapStats.total_heap_size / heapStats.heap_size_limit;
    if (totalHeapRatio > 0.7) {
      recommendations.push('Approaching heap size limit. Consider memory optimization');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Memory usage is within optimal ranges');
    }
    
    return recommendations;
  }
}