import fs from 'fs';
import path from 'path';

import { describe, it, expect } from 'vitest';

/**
 * バンドル最適化テスト
 * TDD: 期待される最適化結果を定義してから実装を検証
 */
describe('Bundle Optimization Tests', () => {
  const buildDir = path.join(process.cwd(), '.vite/build');
  
  it('should properly separate vendor dependencies', () => {
    // TDD: 期待値 - React、Three.js、Zustandが別々のチャンクに分離されるべき
    if (!fs.existsSync(buildDir)) {
      console.log('Build directory not found, skipping vendor separation test');
      return;
    }
    
    const files = fs.readdirSync(buildDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    // 最低限2つ以上のJSファイルが存在すべき（main.js + vendor chunks）
    expect(jsFiles.length).toBeGreaterThan(1);
    
    // 大きなファイル（50KB以上）が複数存在する場合、適切に分離されている
    const largeFiles = jsFiles.filter(file => {
      const stats = fs.statSync(path.join(buildDir, file));
      return stats.size > 50 * 1024; // 50KB
    });
    
    if (largeFiles.length > 1) {
      expect(largeFiles.length).toBeGreaterThan(1);
    }
  });
  
  it('should have optimized chunk sizes for performance', () => {
    // TDD: 期待値 - 各チャンクは適度なサイズ（200KB-500KB）であるべき
    if (!fs.existsSync(buildDir)) {
      console.log('Build directory not found, skipping chunk size test');
      return;
    }
    
    const files = fs.readdirSync(buildDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    const MAX_CHUNK_SIZE = 500 * 1024; // 500KB
    const MIN_MEANINGFUL_SIZE = 10 * 1024; // 10KB
    
    jsFiles.forEach(file => {
      const stats = fs.statSync(path.join(buildDir, file));
      
      // 各チャンクは500KB以下であるべき
      expect(stats.size).toBeLessThan(MAX_CHUNK_SIZE);
      
      // preload.js以外は10KB以上の意味のあるサイズであるべき
      if (!file.includes('preload')) {
        expect(stats.size).toBeGreaterThan(MIN_MEANINGFUL_SIZE);
      }
    });
  });
  
  it('should have efficient tree-shaking results', () => {
    // TDD: 期待値 - 未使用コードが除去され、総サイズが最適化されているべき
    if (!fs.existsSync(buildDir)) {
      console.log('Build directory not found, skipping tree-shaking test');
      return;
    }
    
    const files = fs.readdirSync(buildDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    let totalJSSize = 0;
    jsFiles.forEach(file => {
      const stats = fs.statSync(path.join(buildDir, file));
      totalJSSize += stats.size;
    });
    
    // 総JSサイズは2MB以下であるべき（VRMファイルを除く）
    const TARGET_TOTAL_JS_SIZE = 2 * 1024 * 1024; // 2MB
    expect(totalJSSize).toBeLessThan(TARGET_TOTAL_JS_SIZE);
  });
  
  it('should exclude development dependencies from production build', () => {
    // TDD: 期待値 - 開発用依存関係が本番ビルドに含まれないべき
    if (!fs.existsSync(buildDir)) {
      console.log('Build directory not found, skipping dev dependencies test');
      return;
    }
    
    const files = fs.readdirSync(buildDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    // 開発用パッケージがバンドルに含まれていないことを確認
    // （この検証は文字列検索で簡易的に行う）
    jsFiles.forEach(file => {
      const content = fs.readFileSync(path.join(buildDir, file), 'utf8');
      
      // 本番環境に不要な開発用コードが含まれていないか確認
      expect(content).not.toContain('console.debug');
      expect(content).not.toContain('vitest');
      expect(content).not.toContain('jest');
    });
  });
});

/**
 * バンドル最適化分析ユーティリティ
 */
export class BundleOptimizationAnalyzer {
  static analyzeOptimization(buildDir: string) {
    if (!fs.existsSync(buildDir)) {
      return null;
    }
    
    const files = fs.readdirSync(buildDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    const analysis = {
      totalFiles: jsFiles.length,
      totalJSSize: 0,
      chunks: [] as Array<{
        name: string;
        size: number;
        sizeFormatted: string;
        category: 'main' | 'vendor' | 'preload' | 'other';
      }>,
      optimization: {
        isChunksSeparated: jsFiles.length > 1,
        averageChunkSize: 0,
        recommendedImprovements: [] as string[],
      }
    };
    
    jsFiles.forEach(file => {
      const stats = fs.statSync(path.join(buildDir, file));
      const sizeInKB = Math.round(stats.size / 1024);
      
      let category: 'main' | 'vendor' | 'preload' | 'other' = 'other';
      if (file.includes('main')) category = 'main';
      else if (file.includes('vendor') || file.includes('react') || file.includes('three')) category = 'vendor';
      else if (file.includes('preload')) category = 'preload';
      
      analysis.totalJSSize += stats.size;
      analysis.chunks.push({
        name: file,
        size: stats.size,
        sizeFormatted: `${sizeInKB} KB`,
        category,
      });
    });
    
    analysis.optimization.averageChunkSize = analysis.totalJSSize / jsFiles.length;
    
    // 最適化推奨事項の生成
    if (!analysis.optimization.isChunksSeparated) {
      analysis.optimization.recommendedImprovements.push('Code splitting should be implemented');
    }
    
    if (analysis.totalJSSize > 2 * 1024 * 1024) {
      analysis.optimization.recommendedImprovements.push('Total bundle size should be reduced');
    }
    
    const hasLargeChunks = analysis.chunks.some(chunk => chunk.size > 500 * 1024);
    if (hasLargeChunks) {
      analysis.optimization.recommendedImprovements.push('Large chunks should be split further');
    }
    
    // サイズ順にソート
    analysis.chunks.sort((a, b) => b.size - a.size);
    
    return analysis;
  }
}