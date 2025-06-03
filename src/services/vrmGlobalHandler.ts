/**
 * VRMGlobalHandler Service
 * VRM表情操作のグローバル公開インターフェース
 */
import { getAvailableExpressions, applyExpression } from '../vrmController';

export interface VRMGlobalInterface {
    getAvailableExpressions: () => any[];
    setExpression: (name: string, intensity?: number) => void;
    resetToDefaultExpression: () => void;
    applyExpression: (expressionName: string, intensity?: number) => boolean;
}

export class VRMGlobalHandler {
    initialize() {
        this.setupGlobalVRMExpressionInterface();
    }

    private setupGlobalVRMExpressionInterface() {
        // VRM表情関連の関数をグローバルに公開
        (window as any).vrmExpression = {
            getAvailableExpressions: () => {
                try {
                    console.log('[VRMGlobalHandler] グローバル表情取得要求');
                    const expressions = getAvailableExpressions();
                    console.log('[VRMGlobalHandler] グローバル表情取得結果:', expressions.length);
                    return expressions;
                } catch (error) {
                    console.error('[VRMGlobalHandler] グローバル表情取得エラー:', error);
                    return [];
                }
            },
            
            setExpression: (name: string, intensity?: number) => {
                try {
                    console.log('[VRMGlobalHandler] グローバル表情設定要求:', name, intensity);
                    applyExpression(name, intensity);
                } catch (error) {
                    console.error('[VRMGlobalHandler] グローバル表情設定エラー:', error);
                }
            },
            
            resetToDefaultExpression: () => {
                try {
                    console.log('[VRMGlobalHandler] デフォルト表情リセット要求');
                    // デフォルト表情への reset ロジックを実装する必要があります
                    // 現在は空の実装
                } catch (error) {
                    console.error('[VRMGlobalHandler] デフォルト表情リセットエラー:', error);
                }
            },
            
            applyExpression: (expressionName: string, intensity?: number) => {
                try {
                    console.log('[VRMGlobalHandler] グローバル表情適用要求:', expressionName, intensity);
                    const success = applyExpression(expressionName, intensity);
                    console.log('[VRMGlobalHandler] グローバル表情適用結果:', success);
                    return success;
                } catch (error) {
                    console.error('[VRMGlobalHandler] グローバル表情適用エラー:', error);
                    return false;
                }
            }
        };
    }
}

export function createVRMGlobalHandler(): VRMGlobalHandler {
    return new VRMGlobalHandler();
}