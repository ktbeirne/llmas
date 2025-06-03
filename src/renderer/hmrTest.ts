/**
 * hmrTest.ts - Hot Module Replacement (HMR) 動作テスト
 *
 * Phase 3.1.8: Hot reload動作確認・開発環境最適化
 * React HMRの動作を自動的に検証
 */

interface HMRTestResult {
  feature: string;
  status: 'working' | 'not-working' | 'unknown';
  details: string;
  timestamp: string;
}

/**
 * Hot Module Replacement 機能テスター
 */
export class HMRTester {
  private results: HMRTestResult[] = [];

  /**
   * HMR機能の総合テスト実行
   */
  async runHMRTests(): Promise<HMRTestResult[]> {
    console.log('🔥 [HMR Test] Starting Hot Module Replacement tests...');

    this.results = [];

    // 基本HMR機能の確認
    this.testHMRAvailability();

    // Vite HMR APIの確認
    this.testViteHMRAPI();

    // React Hot Reloadの確認
    this.testReactHotReload();

    // 開発環境ツールの確認
    this.testDevTools();

    // WebSocket接続の確認
    this.testWebSocketConnection();

    console.log('✅ [HMR Test] All HMR tests completed');
    this.logHMRSummary();

    return this.results;
  }

  /**
   * HMR機能の基本的な利用可能性確認
   */
  private testHMRAvailability(): void {
    const timestamp = new Date().toISOString();

    try {
      if (typeof import.meta.hot !== 'undefined') {
        this.results.push({
          feature: 'HMR Availability',
          status: 'working',
          details: 'import.meta.hot is available',
          timestamp,
        });
        console.log('✅ [HMR Test] HMR is available');
      } else {
        this.results.push({
          feature: 'HMR Availability',
          status: 'not-working',
          details: 'import.meta.hot is undefined',
          timestamp,
        });
        console.log('❌ [HMR Test] HMR is not available');
      }
    } catch (error) {
      this.results.push({
        feature: 'HMR Availability',
        status: 'unknown',
        details: `Error checking HMR: ${error}`,
        timestamp,
      });
    }
  }

  /**
   * Vite HMR APIの確認
   */
  private testViteHMRAPI(): void {
    const timestamp = new Date().toISOString();

    try {
      if (import.meta.hot) {
        const availableAPIs = [];

        if (typeof import.meta.hot.accept === 'function') {
          availableAPIs.push('accept');
        }
        if (typeof import.meta.hot.dispose === 'function') {
          availableAPIs.push('dispose');
        }
        if (typeof import.meta.hot.invalidate === 'function') {
          availableAPIs.push('invalidate');
        }
        if (typeof import.meta.hot.data !== 'undefined') {
          availableAPIs.push('data');
        }

        this.results.push({
          feature: 'Vite HMR API',
          status: availableAPIs.length > 0 ? 'working' : 'not-working',
          details: `Available APIs: ${availableAPIs.join(', ')}`,
          timestamp,
        });

        console.log(`🔧 [HMR Test] Vite HMR APIs: ${availableAPIs.join(', ')}`);
      } else {
        this.results.push({
          feature: 'Vite HMR API',
          status: 'not-working',
          details: 'import.meta.hot is not available',
          timestamp,
        });
      }
    } catch (error) {
      this.results.push({
        feature: 'Vite HMR API',
        status: 'unknown',
        details: `Error testing Vite HMR API: ${error}`,
        timestamp,
      });
    }
  }

  /**
   * React Hot Reloadの確認
   */
  private testReactHotReload(): void {
    const timestamp = new Date().toISOString();

    try {
      // React Refresh（React Hot Reload）の確認
      if (typeof window !== 'undefined' && (window as any).$RefreshReg$) {
        this.results.push({
          feature: 'React Hot Reload',
          status: 'working',
          details: 'React Refresh ($RefreshReg$) is available',
          timestamp,
        });
        console.log('⚛️ [HMR Test] React Hot Reload is working');
      } else {
        this.results.push({
          feature: 'React Hot Reload',
          status: 'not-working',
          details: 'React Refresh ($RefreshReg$) is not available',
          timestamp,
        });
        console.log('❌ [HMR Test] React Hot Reload is not working');
      }
    } catch (error) {
      this.results.push({
        feature: 'React Hot Reload',
        status: 'unknown',
        details: `Error testing React Hot Reload: ${error}`,
        timestamp,
      });
    }
  }

  /**
   * 開発環境ツールの確認
   */
  private testDevTools(): void {
    const timestamp = new Date().toISOString();

    try {
      const devTools = [];

      // React DevToolsの確認
      if (typeof window !== 'undefined' && (window as any).__REACT_DEVTOOLS_GLOBAL_HOOK__) {
        devTools.push('React DevTools');
      }

      // Electronの開発者ツールの確認
      if (typeof window !== 'undefined' && window.electronAPI) {
        devTools.push('Electron DevTools');
      }

      // Console APIの確認
      if (typeof console !== 'undefined' && console.log) {
        devTools.push('Console API');
      }

      this.results.push({
        feature: 'Development Tools',
        status: devTools.length > 0 ? 'working' : 'not-working',
        details: `Available tools: ${devTools.join(', ')}`,
        timestamp,
      });

      console.log(`🛠️ [HMR Test] Development tools: ${devTools.join(', ')}`);
    } catch (error) {
      this.results.push({
        feature: 'Development Tools',
        status: 'unknown',
        details: `Error testing development tools: ${error}`,
        timestamp,
      });
    }
  }

  /**
   * WebSocket接続の確認（HMR通信用）
   */
  private testWebSocketConnection(): void {
    const timestamp = new Date().toISOString();

    try {
      // HMR WebSocket接続の確認
      if (import.meta.hot && typeof import.meta.hot.send === 'function') {
        this.results.push({
          feature: 'WebSocket Connection',
          status: 'working',
          details: 'HMR WebSocket communication is available',
          timestamp,
        });
        console.log('🌐 [HMR Test] WebSocket connection for HMR is working');
      } else {
        this.results.push({
          feature: 'WebSocket Connection',
          status: 'not-working',
          details: 'HMR WebSocket communication is not available',
          timestamp,
        });
        console.log('❌ [HMR Test] WebSocket connection for HMR is not working');
      }
    } catch (error) {
      this.results.push({
        feature: 'WebSocket Connection',
        status: 'unknown',
        details: `Error testing WebSocket: ${error}`,
        timestamp,
      });
    }
  }

  /**
   * HMRテスト結果の概要をログ出力
   */
  private logHMRSummary(): void {
    const working = this.results.filter(r => r.status === 'working').length;
    const notWorking = this.results.filter(r => r.status === 'not-working').length;
    const unknown = this.results.filter(r => r.status === 'unknown').length;

    console.log(`\n📊 [HMR Test] HMR Test Summary:`);
    console.log(`   ✅ Working: ${working}`);
    console.log(`   ❌ Not Working: ${notWorking}`);
    console.log(`   ❓ Unknown: ${unknown}`);
    console.log(`   📈 Success Rate: ${((working / this.results.length) * 100).toFixed(1)}%`);

    if (notWorking > 0) {
      console.log('\n❌ Not Working Features:');
      this.results
        .filter(r => r.status === 'not-working')
        .forEach(result => {
          console.log(`   - ${result.feature}: ${result.details}`);
        });
    }

    if (unknown > 0) {
      console.log('\n❓ Unknown Status Features:');
      this.results
        .filter(r => r.status === 'unknown')
        .forEach(result => {
          console.log(`   - ${result.feature}: ${result.details}`);
        });
    }
  }

  /**
   * HMRテスト結果の取得
   */
  getResults(): HMRTestResult[] {
    return [...this.results];
  }

  /**
   * HMR状態の継続監視開始
   */
  startHMRMonitoring(): void {
    console.log('🔄 [HMR Test] Starting HMR monitoring...');

    if (import.meta.hot) {
      // ファイル変更の監視
      import.meta.hot.accept(newModule => {
        console.log('🔄 [HMR Test] Module updated:', newModule);
      });

      // HMRエラーの監視
      import.meta.hot.on('vite:error', error => {
        console.error('❌ [HMR Test] HMR error:', error);
      });

      // 接続状態の監視
      import.meta.hot.on('vite:ws:connect', () => {
        console.log('🌐 [HMR Test] WebSocket connected');
      });

      import.meta.hot.on('vite:ws:disconnect', () => {
        console.log('🌐 [HMR Test] WebSocket disconnected');
      });
    }
  }
}

// グローバルに公開してConsoleから使用可能にする
declare global {
  interface Window {
    HMRTester: typeof HMRTester;
    runHMRTests: () => Promise<HMRTestResult[]>;
    startHMRMonitoring: () => void;
  }
}

// テスターをグローバルに公開
if (typeof window !== 'undefined') {
  window.HMRTester = HMRTester;

  // 便利な関数をグローバルに公開
  window.runHMRTests = async () => {
    const tester = new HMRTester();
    return await tester.runHMRTests();
  };

  window.startHMRMonitoring = () => {
    const tester = new HMRTester();
    tester.startHMRMonitoring();
  };
}
