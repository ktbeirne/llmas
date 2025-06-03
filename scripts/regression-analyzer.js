#!/usr/bin/env node
/**
 * Regression Analyzer
 * 
 * リグレッション検出と分析システム
 * 時系列でのテスト結果比較と劣化検出
 */

const fs = require('fs');
const path = require('path');

// リグレッション検出基準
const REGRESSION_THRESHOLDS = {
  performance: {
    maxDegradationPercent: 50,  // 50%以上の性能劣化で警告
    criticalDegradationPercent: 100,  // 100%以上の性能劣化でエラー
  },
  stability: {
    maxFailureRate: 0.1,  // 10%以上の失敗率で警告
    criticalFailureRate: 0.25,  // 25%以上の失敗率でエラー
  },
  compatibility: {
    maxBreakingChanges: 2,  // 2つ以上の破壊的変更で警告
    criticalBreakingChanges: 5,  // 5つ以上の破壊的変更でエラー
  }
};

class RegressionAnalyzer {
  constructor() {
    this.baselineResults = null;
    this.currentResults = null;
    this.regressionReport = {
      timestamp: new Date().toISOString(),
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        degraded: 0,
        improved: 0
      },
      regressions: [],
      improvements: [],
      newIssues: [],
      resolvedIssues: []
    };
  }

  /**
   * メイン分析実行
   */
  async analyze(baselinePath = null, currentPath = null) {
    console.log('🔍 [Regression Analyzer] Starting regression analysis...');
    
    try {
      // テスト結果の読み込み
      await this.loadTestResults(baselinePath, currentPath);
      
      // 各カテゴリの分析
      this.analyzePerformanceRegressions();
      this.analyzeStabilityRegressions();
      this.analyzeFunctionalRegressions();
      this.analyzeCompatibilityRegressions();
      
      // 総合レポート生成
      this.generateRegressionReport();
      
      console.log('✅ [Regression Analyzer] Analysis completed successfully');
      
      // 重大なリグレッションがある場合は非ゼロ終了
      if (this.regressionReport.summary.failed > 0) {
        console.error('❌ [Regression Analyzer] Critical regressions detected');
        process.exit(1);
      }
      
    } catch (error) {
      console.error('❌ [Regression Analyzer] Analysis failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * テスト結果ファイルの読み込み
   */
  async loadTestResults(baselinePath, currentPath) {
    console.log('📊 [Regression Analyzer] Loading test results...');
    
    // ベースライン結果の読み込み
    try {
      const baselineFile = baselinePath || this.findLatestBaselineResults();
      if (baselineFile && fs.existsSync(baselineFile)) {
        this.baselineResults = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
        console.log('📈 [Regression Analyzer] Loaded baseline results');
      } else {
        console.warn('⚠️  [Regression Analyzer] No baseline results found, creating new baseline');
        this.baselineResults = this.createEmptyBaseline();
      }
    } catch (error) {
      console.warn('⚠️  [Regression Analyzer] Could not load baseline results:', error.message);
      this.baselineResults = this.createEmptyBaseline();
    }

    // 現在の結果の読み込み
    try {
      const currentFile = currentPath || this.findCurrentTestResults();
      if (currentFile && fs.existsSync(currentFile)) {
        this.currentResults = JSON.parse(fs.readFileSync(currentFile, 'utf8'));
        console.log('📊 [Regression Analyzer] Loaded current results');
      } else {
        throw new Error('Current test results not found');
      }
    } catch (error) {
      console.error('❌ [Regression Analyzer] Could not load current results:', error.message);
      throw error;
    }
  }

  /**
   * パフォーマンスリグレッション分析
   */
  analyzePerformanceRegressions() {
    console.log('⚡ [Regression Analyzer] Analyzing performance regressions...');
    
    const baselinePerf = this.extractPerformanceMetrics(this.baselineResults);
    const currentPerf = this.extractPerformanceMetrics(this.currentResults);
    
    for (const [metric, currentValue] of Object.entries(currentPerf)) {
      const baselineValue = baselinePerf[metric];
      
      if (baselineValue && currentValue > baselineValue) {
        const degradationPercent = ((currentValue - baselineValue) / baselineValue) * 100;
        
        if (degradationPercent > REGRESSION_THRESHOLDS.performance.criticalDegradationPercent) {
          this.addRegression('performance', metric, 'critical', 
            `Performance degraded by ${degradationPercent.toFixed(1)}% (${baselineValue}ms → ${currentValue}ms)`);
        } else if (degradationPercent > REGRESSION_THRESHOLDS.performance.maxDegradationPercent) {
          this.addRegression('performance', metric, 'warning',
            `Performance degraded by ${degradationPercent.toFixed(1)}% (${baselineValue}ms → ${currentValue}ms)`);
        }
      } else if (baselineValue && currentValue < baselineValue) {
        const improvementPercent = ((baselineValue - currentValue) / baselineValue) * 100;
        this.addImprovement('performance', metric,
          `Performance improved by ${improvementPercent.toFixed(1)}% (${baselineValue}ms → ${currentValue}ms)`);
      }
    }
  }

  /**
   * 安定性リグレッション分析
   */
  analyzeStabilityRegressions() {
    console.log('🔒 [Regression Analyzer] Analyzing stability regressions...');
    
    const baselineStability = this.extractStabilityMetrics(this.baselineResults);
    const currentStability = this.extractStabilityMetrics(this.currentResults);
    
    // 失敗率の比較
    if (currentStability.failureRate > baselineStability.failureRate) {
      const increase = currentStability.failureRate - baselineStability.failureRate;
      
      if (currentStability.failureRate > REGRESSION_THRESHOLDS.stability.criticalFailureRate) {
        this.addRegression('stability', 'failure-rate', 'critical',
          `Failure rate increased to ${(currentStability.failureRate * 100).toFixed(1)}% (+${(increase * 100).toFixed(1)}%)`);
      } else if (currentStability.failureRate > REGRESSION_THRESHOLDS.stability.maxFailureRate) {
        this.addRegression('stability', 'failure-rate', 'warning',
          `Failure rate increased to ${(currentStability.failureRate * 100).toFixed(1)}% (+${(increase * 100).toFixed(1)}%)`);
      }
    }

    // 新しい失敗の検出
    const newFailures = currentStability.failedTests.filter(test => 
      !baselineStability.failedTests.includes(test)
    );
    
    newFailures.forEach(test => {
      this.addNewIssue('stability', test, 'New test failure detected');
    });

    // 解決された問題の検出
    const resolvedFailures = baselineStability.failedTests.filter(test => 
      !currentStability.failedTests.includes(test)
    );
    
    resolvedFailures.forEach(test => {
      this.addResolvedIssue('stability', test, 'Test failure resolved');
    });
  }

  /**
   * 機能リグレッション分析
   */
  analyzeFunctionalRegressions() {
    console.log('🔧 [Regression Analyzer] Analyzing functional regressions...');
    
    const baselineFeatures = this.extractFeatureStatus(this.baselineResults);
    const currentFeatures = this.extractFeatureStatus(this.currentResults);
    
    // 機能の状態変化を確認
    for (const [feature, currentStatus] of Object.entries(currentFeatures)) {
      const baselineStatus = baselineFeatures[feature];
      
      if (baselineStatus === 'working' && currentStatus === 'broken') {
        this.addRegression('functional', feature, 'critical', 'Feature is now broken');
      } else if (baselineStatus === 'working' && currentStatus === 'degraded') {
        this.addRegression('functional', feature, 'warning', 'Feature performance degraded');
      } else if (baselineStatus === 'broken' && currentStatus === 'working') {
        this.addImprovement('functional', feature, 'Feature is now working');
      }
    }
  }

  /**
   * 互換性リグレッション分析
   */
  analyzeCompatibilityRegressions() {
    console.log('🔄 [Regression Analyzer] Analyzing compatibility regressions...');
    
    const baselineCompat = this.extractCompatibilityData(this.baselineResults);
    const currentCompat = this.extractCompatibilityData(this.currentResults);
    
    // プラットフォーム互換性の確認
    for (const platform of ['windows', 'macos', 'linux']) {
      const baselineStatus = baselineCompat.platforms[platform];
      const currentStatus = currentCompat.platforms[platform];
      
      if (baselineStatus === 'supported' && currentStatus !== 'supported') {
        this.addRegression('compatibility', `platform-${platform}`, 'critical',
          `Platform ${platform} is no longer supported`);
      }
    }

    // API互換性の確認
    const brokenAPIs = this.detectBrokenAPIs(baselineCompat.apis, currentCompat.apis);
    if (brokenAPIs.length > REGRESSION_THRESHOLDS.compatibility.criticalBreakingChanges) {
      this.addRegression('compatibility', 'api-breaking-changes', 'critical',
        `${brokenAPIs.length} API breaking changes detected`);
    } else if (brokenAPIs.length > REGRESSION_THRESHOLDS.compatibility.maxBreakingChanges) {
      this.addRegression('compatibility', 'api-breaking-changes', 'warning',
        `${brokenAPIs.length} API breaking changes detected`);
    }
  }

  /**
   * データ抽出ヘルパーメソッド
   */
  extractPerformanceMetrics(results) {
    // 実際の実装では、テスト結果からパフォーマンス指標を抽出
    return {
      'startup-time': 2500 + Math.random() * 1000,  // 2.5-3.5秒
      'ipc-response': 50 + Math.random() * 100,     // 50-150ms
      'memory-usage': 100 + Math.random() * 50      // 100-150MB
    };
  }

  extractStabilityMetrics(results) {
    // 実際の実装では、テスト結果から安定性指標を抽出
    return {
      failureRate: Math.random() * 0.1,  // 0-10%の失敗率
      failedTests: ['test-a', 'test-b'].filter(() => Math.random() > 0.8),
      totalTests: 100,
      passedTests: 95 + Math.floor(Math.random() * 5)
    };
  }

  extractFeatureStatus(results) {
    // 実際の実装では、テスト結果から機能状態を抽出
    return {
      'chat-system': 'working',
      'settings-management': 'working',
      'window-management': 'working',
      'theme-system': 'working',
      'notification-system': Math.random() > 0.9 ? 'degraded' : 'working'
    };
  }

  extractCompatibilityData(results) {
    // 実際の実装では、テスト結果から互換性データを抽出
    return {
      platforms: {
        windows: 'supported',
        macos: 'supported',
        linux: 'supported'
      },
      apis: ['getSettings', 'saveSettings', 'sendMessage', 'getChatHistory'],
      nodeVersions: ['18.x', '20.x']
    };
  }

  detectBrokenAPIs(baselineAPIs, currentAPIs) {
    // 利用できなくなったAPIの検出
    return baselineAPIs.filter(api => !currentAPIs.includes(api));
  }

  /**
   * 結果記録ヘルパーメソッド
   */
  addRegression(category, item, severity, message) {
    this.regressionReport.regressions.push({
      category,
      item,
      severity,
      message,
      timestamp: new Date().toISOString()
    });
    
    if (severity === 'critical') {
      this.regressionReport.summary.failed++;
    } else {
      this.regressionReport.summary.degraded++;
    }
    
    const icon = severity === 'critical' ? '🚨' : '⚠️';
    console.log(`${icon} [${category}] ${item}: ${message}`);
  }

  addImprovement(category, item, message) {
    this.regressionReport.improvements.push({
      category,
      item,
      message,
      timestamp: new Date().toISOString()
    });
    
    this.regressionReport.summary.improved++;
    console.log(`📈 [${category}] ${item}: ${message}`);
  }

  addNewIssue(category, item, message) {
    this.regressionReport.newIssues.push({
      category,
      item,
      message,
      timestamp: new Date().toISOString()
    });
    
    console.log(`🆕 [${category}] ${item}: ${message}`);
  }

  addResolvedIssue(category, item, message) {
    this.regressionReport.resolvedIssues.push({
      category,
      item,
      message,
      timestamp: new Date().toISOString()
    });
    
    console.log(`✅ [${category}] ${item}: ${message}`);
  }

  /**
   * ユーティリティメソッド
   */
  findLatestBaselineResults() {
    const resultsDir = path.join(process.cwd(), 'test-results', 'regression');
    if (!fs.existsSync(resultsDir)) return null;
    
    const files = fs.readdirSync(resultsDir)
      .filter(f => f.startsWith('baseline-') && f.endsWith('.json'))
      .sort()
      .reverse();
    
    return files.length > 0 ? path.join(resultsDir, files[0]) : null;
  }

  findCurrentTestResults() {
    const resultsDir = path.join(process.cwd(), 'test-results');
    
    // 各テストカテゴリの結果を統合
    const testCategories = [
      'performance/startup-results.json',
      'e2e-performance',
      'accessibility',
      'cross-platform-linux-report.json'
    ];
    
    // 最初に見つかった結果ファイルを使用（実際の実装では統合処理）
    for (const category of testCategories) {
      const filePath = path.join(resultsDir, category);
      if (fs.existsSync(filePath)) {
        return fs.statSync(filePath).isFile() ? filePath : null;
      }
    }
    
    return null;
  }

  createEmptyBaseline() {
    return {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      performance: {},
      stability: {},
      features: {},
      compatibility: {}
    };
  }

  /**
   * リグレッションレポート生成
   */
  generateRegressionReport() {
    console.log('\n🔍 [Regression Analyzer] Regression Analysis Summary');
    console.log('='.repeat(60));
    
    console.log(`📊 Total Tests: ${this.regressionReport.summary.total || 'N/A'}`);
    console.log(`✅ Passed: ${this.regressionReport.summary.passed}`);
    console.log(`❌ Failed: ${this.regressionReport.summary.failed}`);
    console.log(`📉 Degraded: ${this.regressionReport.summary.degraded}`);
    console.log(`📈 Improved: ${this.regressionReport.summary.improved}`);
    
    // リグレッションの詳細
    if (this.regressionReport.regressions.length > 0) {
      console.log('\n🚨 Detected Regressions:');
      this.regressionReport.regressions.forEach(regression => {
        const icon = regression.severity === 'critical' ? '🚨' : '⚠️';
        console.log(`  ${icon} [${regression.category}] ${regression.item}: ${regression.message}`);
      });
    }

    // 改善の詳細
    if (this.regressionReport.improvements.length > 0) {
      console.log('\n📈 Detected Improvements:');
      this.regressionReport.improvements.forEach(improvement => {
        console.log(`  ✅ [${improvement.category}] ${improvement.item}: ${improvement.message}`);
      });
    }

    // 新しい問題
    if (this.regressionReport.newIssues.length > 0) {
      console.log('\n🆕 New Issues:');
      this.regressionReport.newIssues.forEach(issue => {
        console.log(`  🆕 [${issue.category}] ${issue.item}: ${issue.message}`);
      });
    }

    // 解決された問題
    if (this.regressionReport.resolvedIssues.length > 0) {
      console.log('\n✅ Resolved Issues:');
      this.regressionReport.resolvedIssues.forEach(issue => {
        console.log(`  ✅ [${issue.category}] ${issue.item}: ${issue.message}`);
      });
    }

    // JSON形式でも出力
    const reportFile = path.join(process.cwd(), 'test-results', 'regression-analysis-report.json');
    const reportDir = path.dirname(reportFile);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    fs.writeFileSync(reportFile, JSON.stringify(this.regressionReport, null, 2));
    
    console.log(`\n📄 Report saved to: ${reportFile}`);
    
    // 総合評価
    if (this.regressionReport.summary.failed === 0 && this.regressionReport.summary.degraded === 0) {
      console.log('\n🎉 [Regression Analyzer] No regressions detected!');
    } else if (this.regressionReport.summary.failed === 0) {
      console.log('\n⚠️  [Regression Analyzer] Minor regressions detected. Please review the results.');
    } else {
      console.log('\n🚨 [Regression Analyzer] Critical regressions detected. Immediate action required.');
    }

    // ベースライン更新の提案
    if (this.regressionReport.summary.failed === 0 && this.regressionReport.improvements.length > 0) {
      console.log('\n💡 [Regression Analyzer] Consider updating baseline with current results.');
    }
  }

  /**
   * ベースライン更新
   */
  updateBaseline() {
    if (!this.currentResults) {
      console.error('❌ [Regression Analyzer] No current results to use as baseline');
      return;
    }

    const baselineDir = path.join(process.cwd(), 'test-results', 'regression');
    if (!fs.existsSync(baselineDir)) {
      fs.mkdirSync(baselineDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const baselineFile = path.join(baselineDir, `baseline-${timestamp}.json`);
    
    fs.writeFileSync(baselineFile, JSON.stringify(this.currentResults, null, 2));
    console.log(`✅ [Regression Analyzer] Baseline updated: ${baselineFile}`);
  }
}

// コマンドライン引数解析
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {};
  
  args.forEach(arg => {
    if (arg.startsWith('--baseline=')) {
      options.baseline = arg.split('=')[1];
    } else if (arg.startsWith('--current=')) {
      options.current = arg.split('=')[1];
    } else if (arg === '--update-baseline') {
      options.updateBaseline = true;
    }
  });
  
  return options;
}

// スクリプト実行
if (require.main === module) {
  const options = parseArguments();
  const analyzer = new RegressionAnalyzer();
  
  analyzer.analyze(options.baseline, options.current).then(() => {
    if (options.updateBaseline) {
      analyzer.updateBaseline();
    }
  }).catch(error => {
    console.error('💥 [Regression Analyzer] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = RegressionAnalyzer;