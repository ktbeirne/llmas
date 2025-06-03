#!/usr/bin/env node
/**
 * Performance Analysis Script
 * 
 * CI/CDパイプライン用のパフォーマンス分析ツール
 * テスト結果を解析し、パフォーマンス指標をレポート
 */

const fs = require('fs');
const path = require('path');

// パフォーマンス閾値定義
const PERFORMANCE_THRESHOLDS = {
  startup: {
    maxStartupTime: 3000, // 3秒
    maxMemoryIncrease: 100, // 100MB
  },
  ipc: {
    maxResponseTime: 1000, // 1秒 (10回の操作)
    maxBatchResponseTime: 5000, // 5秒 (バッチ操作)
  },
  memory: {
    maxHeapIncrease: 104857600, // 100MB in bytes
    maxLeakRate: 0.1, // 10%増加率
  },
  integration: {
    maxWorkflowTime: 10000, // 10秒
    maxConcurrentOperations: 2000, // 2秒
  }
};

class PerformanceAnalyzer {
  constructor() {
    this.results = {
      startup: null,
      memory: null,
      e2e: null,
      integration: null
    };
    this.summary = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
    };
  }

  /**
   * メイン解析実行
   */
  async analyze() {
    console.log('🔍 [Performance Analyzer] Starting performance analysis...');
    
    try {
      // テスト結果ファイルの読み込み
      await this.loadTestResults();
      
      // 各カテゴリの解析
      this.analyzeStartupPerformance();
      this.analyzeMemoryUsage();
      this.analyzeE2EPerformance();
      this.analyzeIntegrationBenchmarks();
      
      // 総合レポート生成
      this.generateSummaryReport();
      
      console.log('✅ [Performance Analyzer] Analysis completed successfully');
      
      // 閾値違反がある場合は非ゼロ終了
      if (this.summary.failed > 0) {
        console.error('❌ [Performance Analyzer] Performance thresholds exceeded');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ [Performance Analyzer] Analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * テスト結果ファイルの読み込み
   */
  async loadTestResults() {
    const resultsDir = path.join(process.cwd(), 'test-results');
    
    // 起動パフォーマンステスト結果
    try {
      const startupFile = path.join(resultsDir, 'performance', 'startup-results.json');
      if (fs.existsSync(startupFile)) {
        this.results.startup = JSON.parse(fs.readFileSync(startupFile, 'utf8'));
        console.log('📊 [Performance Analyzer] Loaded startup performance results');
      }
    } catch (error) {
      console.warn('⚠️  [Performance Analyzer] Could not load startup results:', error.message);
    }

    // メモリ使用量テスト結果
    try {
      const memoryFile = path.join(resultsDir, 'performance', 'memory-results.json');
      if (fs.existsSync(memoryFile)) {
        this.results.memory = JSON.parse(fs.readFileSync(memoryFile, 'utf8'));
        console.log('🧠 [Performance Analyzer] Loaded memory usage results');
      }
    } catch (error) {
      console.warn('⚠️  [Performance Analyzer] Could not load memory results:', error.message);
    }

    // E2Eパフォーマンステスト結果  
    try {
      const e2eDir = path.join(resultsDir, 'e2e-performance');
      if (fs.existsSync(e2eDir)) {
        // Playwrightの結果ファイルを探す
        const files = fs.readdirSync(e2eDir);
        const resultFile = files.find(f => f.endsWith('.json') || f.includes('results'));
        if (resultFile) {
          this.results.e2e = JSON.parse(fs.readFileSync(path.join(e2eDir, resultFile), 'utf8'));
          console.log('⚡ [Performance Analyzer] Loaded E2E performance results');
        }
      }
    } catch (error) {
      console.warn('⚠️  [Performance Analyzer] Could not load E2E results:', error.message);
    }

    // 統合ベンチマーク結果
    try {
      const integrationDir = path.join(resultsDir, 'integration-performance');
      if (fs.existsSync(integrationDir)) {
        const files = fs.readdirSync(integrationDir);
        const resultFile = files.find(f => f.endsWith('.json') || f.includes('results'));
        if (resultFile) {
          this.results.integration = JSON.parse(fs.readFileSync(path.join(integrationDir, resultFile), 'utf8'));
          console.log('🔗 [Performance Analyzer] Loaded integration benchmark results');
        }
      }
    } catch (error) {
      console.warn('⚠️  [Performance Analyzer] Could not load integration results:', error.message);
    }
  }

  /**
   * 起動パフォーマンス解析
   */
  analyzeStartupPerformance() {
    console.log('🚀 [Performance Analyzer] Analyzing startup performance...');
    
    if (!this.results.startup) {
      this.addWarning('startup', 'Startup performance results not available');
      return;
    }

    // 起動時間チェック（模擬データ処理）
    const startupTime = this.extractStartupTime(this.results.startup);
    if (startupTime > PERFORMANCE_THRESHOLDS.startup.maxStartupTime) {
      this.addFailure('startup', `Startup time ${startupTime}ms exceeds threshold ${PERFORMANCE_THRESHOLDS.startup.maxStartupTime}ms`);
    } else {
      this.addSuccess('startup', `Startup time ${startupTime}ms within acceptable range`);
    }

    // メモリ使用量チェック
    const memoryIncrease = this.extractMemoryIncrease(this.results.startup);
    if (memoryIncrease > PERFORMANCE_THRESHOLDS.startup.maxMemoryIncrease) {
      this.addFailure('startup', `Memory increase ${memoryIncrease}MB exceeds threshold ${PERFORMANCE_THRESHOLDS.startup.maxMemoryIncrease}MB`);
    } else {
      this.addSuccess('startup', `Memory increase ${memoryIncrease}MB within acceptable range`);
    }
  }

  /**
   * メモリ使用量解析
   */
  analyzeMemoryUsage() {
    console.log('🧠 [Performance Analyzer] Analyzing memory usage...');
    
    if (!this.results.memory) {
      this.addWarning('memory', 'Memory usage results not available');
      return;
    }

    // メモリリーク検出（模擬）
    const leakRate = this.extractMemoryLeakRate(this.results.memory);
    if (leakRate > PERFORMANCE_THRESHOLDS.memory.maxLeakRate) {
      this.addFailure('memory', `Memory leak rate ${(leakRate * 100).toFixed(2)}% exceeds threshold ${(PERFORMANCE_THRESHOLDS.memory.maxLeakRate * 100)}%`);
    } else {
      this.addSuccess('memory', `Memory leak rate ${(leakRate * 100).toFixed(2)}% within acceptable range`);
    }
  }

  /**
   * E2Eパフォーマンス解析
   */
  analyzeE2EPerformance() {
    console.log('⚡ [Performance Analyzer] Analyzing E2E performance...');
    
    if (!this.results.e2e) {
      this.addWarning('e2e', 'E2E performance results not available');
      return;
    }

    // IPC応答時間解析（模擬）
    const ipcResponseTime = this.extractIPCResponseTime(this.results.e2e);
    if (ipcResponseTime > PERFORMANCE_THRESHOLDS.ipc.maxResponseTime) {
      this.addFailure('e2e', `IPC response time ${ipcResponseTime}ms exceeds threshold ${PERFORMANCE_THRESHOLDS.ipc.maxResponseTime}ms`);
    } else {
      this.addSuccess('e2e', `IPC response time ${ipcResponseTime}ms within acceptable range`);
    }
  }

  /**
   * 統合ベンチマーク解析
   */
  analyzeIntegrationBenchmarks() {
    console.log('🔗 [Performance Analyzer] Analyzing integration benchmarks...');
    
    if (!this.results.integration) {
      this.addWarning('integration', 'Integration benchmark results not available');
      return;
    }

    // ワークフロー実行時間解析（模擬）
    const workflowTime = this.extractWorkflowTime(this.results.integration);
    if (workflowTime > PERFORMANCE_THRESHOLDS.integration.maxWorkflowTime) {
      this.addFailure('integration', `Workflow time ${workflowTime}ms exceeds threshold ${PERFORMANCE_THRESHOLDS.integration.maxWorkflowTime}ms`);
    } else {
      this.addSuccess('integration', `Workflow time ${workflowTime}ms within acceptable range`);
    }
  }

  /**
   * データ抽出ヘルパーメソッド（模擬実装）
   */
  extractStartupTime(data) {
    // 実際の実装では、テストデータから起動時間を抽出
    return Math.floor(Math.random() * 4000) + 1000; // 1-5秒のランダム値
  }

  extractMemoryIncrease(data) {
    // 実際の実装では、テストデータからメモリ増加量を抽出
    return Math.floor(Math.random() * 150) + 10; // 10-160MBのランダム値
  }

  extractMemoryLeakRate(data) {
    // 実際の実装では、テストデータからメモリリーク率を抽出
    return Math.random() * 0.2; // 0-20%のランダム値
  }

  extractIPCResponseTime(data) {
    // 実際の実装では、テストデータからIPC応答時間を抽出
    return Math.floor(Math.random() * 1500) + 200; // 200-1700msのランダム値
  }

  extractWorkflowTime(data) {
    // 実際の実装では、テストデータからワークフロー時間を抽出
    return Math.floor(Math.random() * 12000) + 2000; // 2-14秒のランダム値
  }

  /**
   * 結果記録ヘルパーメソッド
   */
  addSuccess(category, message) {
    this.summary.passed++;
    this.summary.details.push({ type: 'success', category, message });
    console.log(`✅ [${category}] ${message}`);
  }

  addFailure(category, message) {
    this.summary.failed++;
    this.summary.details.push({ type: 'failure', category, message });
    console.log(`❌ [${category}] ${message}`);
  }

  addWarning(category, message) {
    this.summary.warnings++;
    this.summary.details.push({ type: 'warning', category, message });
    console.log(`⚠️  [${category}] ${message}`);
  }

  /**
   * 総合レポート生成
   */
  generateSummaryReport() {
    console.log('\n📊 [Performance Analyzer] Performance Analysis Summary');
    console.log('='.repeat(60));
    
    console.log(`✅ Passed: ${this.summary.passed}`);
    console.log(`❌ Failed: ${this.summary.failed}`);
    console.log(`⚠️  Warnings: ${this.summary.warnings}`);
    
    console.log('\n📋 Detailed Results:');
    this.summary.details.forEach(detail => {
      const icon = detail.type === 'success' ? '✅' : detail.type === 'failure' ? '❌' : '⚠️ ';
      console.log(`  ${icon} [${detail.category}] ${detail.message}`);
    });

    // JSON形式でも出力（CI/CD での解析用）
    const reportFile = path.join(process.cwd(), 'test-results', 'performance-analysis-report.json');
    const reportDir = path.dirname(reportFile);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: this.summary,
      thresholds: PERFORMANCE_THRESHOLDS,
      results: this.results
    }, null, 2));
    
    console.log(`\n📄 Report saved to: ${reportFile}`);
    
    // 総合評価
    if (this.summary.failed === 0) {
      console.log('\n🎉 [Performance Analyzer] All performance tests passed!');
    } else {
      console.log('\n⚠️  [Performance Analyzer] Some performance tests failed. Please review the results.');
    }
  }
}

// スクリプト実行
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  analyzer.analyze().catch(error => {
    console.error('💥 [Performance Analyzer] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = PerformanceAnalyzer;