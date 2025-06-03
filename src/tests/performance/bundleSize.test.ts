import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

/**
 * バンドルサイズパフォーマンステスト
 * TDD: まず期待値を定義してから実装を検証
 */
describe('Bundle Size Performance Tests', () => {
  const buildDir = path.join(process.cwd(), '.vite/build');
  const rendererDir = path.join(process.cwd(), '.vite/renderer/main_window/assets');
  
  it('should have main bundle under reasonable size limit', () => {
    // TDD: 期待値 - メインバンドルは2MB以下であるべき
    const EXPECTED_MAIN_BUNDLE_SIZE_LIMIT = 2 * 1024 * 1024; // 2MB
    
    if (!fs.existsSync(buildDir)) {
      // ビルドが存在しない場合はテストをスキップ
      console.log('Build directory not found, skipping bundle size test');
      return;
    }
    
    const files = fs.readdirSync(buildDir);
    const mainBundle = files.find(file => file.includes('main') && file.endsWith('.js'));
    
    if (mainBundle) {
      const stats = fs.statSync(path.join(buildDir, mainBundle));
      expect(stats.size).toBeLessThan(EXPECTED_MAIN_BUNDLE_SIZE_LIMIT);
    }
  });
  
  it('should have renderer bundle under reasonable size limit', () => {
    // TDD: 期待値 - レンダラーバンドルは5MB以下であるべき
    const EXPECTED_RENDERER_BUNDLE_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB
    
    if (!fs.existsSync(buildDir)) {
      console.log('Build directory not found, skipping bundle size test');
      return;
    }
    
    const files = fs.readdirSync(buildDir);
    const rendererBundle = files.find(file => file.includes('renderer') && file.endsWith('.js'));
    
    if (rendererBundle) {
      const stats = fs.statSync(path.join(buildDir, rendererBundle));
      expect(stats.size).toBeLessThan(EXPECTED_RENDERER_BUNDLE_SIZE_LIMIT);
    }
  });
  
  it('should have vendor chunks properly separated', () => {
    // TDD: 期待値 - ベンダーチャンクが適切に分離されているべき
    if (!fs.existsSync(rendererDir)) {
      console.log('Renderer directory not found, skipping vendor chunk test');
      return;
    }
    
    const files = fs.readdirSync(rendererDir);
    const vendorChunks = files.filter(file => 
      (file.includes('vendor') || file.includes('react') || file.includes('three') || 
       file.includes('state') || file.includes('forms') || file.includes('ai')) && 
      file.endsWith('.js')
    );
    
    // ベンダーチャンクが少なくとも1つは存在すべき（Three.jsチャンクが期待される）
    expect(vendorChunks.length).toBeGreaterThan(0);
  });
  
  it('should have total bundle size within acceptable range', () => {
    // TDD: 期待値 - 総バンドルサイズは10MB以下であるべき
    const EXPECTED_TOTAL_SIZE_LIMIT = 10 * 1024 * 1024; // 10MB
    
    if (!fs.existsSync(buildDir)) {
      console.log('Build directory not found, skipping total size test');
      return;
    }
    
    const files = fs.readdirSync(buildDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    let totalSize = 0;
    jsFiles.forEach(file => {
      const stats = fs.statSync(path.join(buildDir, file));
      totalSize += stats.size;
    });
    
    expect(totalSize).toBeLessThan(EXPECTED_TOTAL_SIZE_LIMIT);
  });
});

/**
 * バンドル構成分析ヘルパー
 */
export class BundleAnalyzer {
  static analyzeBundleComposition(buildDir: string) {
    if (!fs.existsSync(buildDir)) {
      return null;
    }
    
    const files = fs.readdirSync(buildDir);
    const jsFiles = files.filter(file => file.endsWith('.js'));
    
    const analysis = {
      totalFiles: jsFiles.length,
      totalSize: 0,
      chunks: [] as Array<{name: string, size: number, sizeFormatted: string}>,
    };
    
    jsFiles.forEach(file => {
      const stats = fs.statSync(path.join(buildDir, file));
      const sizeInKB = Math.round(stats.size / 1024);
      
      analysis.totalSize += stats.size;
      analysis.chunks.push({
        name: file,
        size: stats.size,
        sizeFormatted: `${sizeInKB} KB`,
      });
    });
    
    // サイズ順にソート
    analysis.chunks.sort((a, b) => b.size - a.size);
    
    return analysis;
  }
}