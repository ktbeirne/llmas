/**
 * MascotStateManager Service
 * 
 * マスコットの状態を一元管理するサービス
 * 表情、アニメーション、スピーチバブル、アイドル状態などを追跡
 */

export interface MascotState {
    isExpressionActive: boolean;
    activeExpression: string | null;
    isAnimationActive: boolean;
    activeAnimation: string | null;
    isSpeechBubbleActive: boolean;
    isIdle: boolean;
    lastActivityTime: number;
}

export class MascotStateManager {
    private static instance: MascotStateManager | null = null;
    
    private state: MascotState = {
        isExpressionActive: false,
        activeExpression: null,
        isAnimationActive: false,
        activeAnimation: null,
        isSpeechBubbleActive: false,
        isIdle: true,
        lastActivityTime: Date.now()
    };
    
    // 状態変更のリスナー
    private listeners: Array<(state: MascotState) => void> = [];
    
    private constructor() {}
    
    static getInstance(): MascotStateManager {
        if (!MascotStateManager.instance) {
            MascotStateManager.instance = new MascotStateManager();
        }
        return MascotStateManager.instance;
    }
    
    // 状態の取得
    getState(): Readonly<MascotState> {
        return { ...this.state };
    }
    
    // 表情の更新
    setExpression(expression: string | null): void {
        const isActive = expression !== null && expression !== '';
        const hasChanged = this.state.isExpressionActive !== isActive || 
                          this.state.activeExpression !== expression;
        
        if (hasChanged) {
            this.state.isExpressionActive = isActive;
            this.state.activeExpression = expression;
            this.updateActivity();
            this.notifyListeners();
        }
    }
    
    // アニメーションの更新
    setAnimation(animation: string | null): void {
        console.log(`[MascotStateManager] setAnimation called with: "${animation}"`);
        
        const isActive = animation !== null && animation !== '';
        const hasChanged = this.state.isAnimationActive !== isActive || 
                          this.state.activeAnimation !== animation;
        
        console.log(`[MascotStateManager] アニメーション状態更新: isActive=${isActive}, hasChanged=${hasChanged}, 現在のisAnimationActive=${this.state.isAnimationActive}`);
        
        if (hasChanged) {
            this.state.isAnimationActive = isActive;
            this.state.activeAnimation = animation;
            this.updateActivity();
            this.notifyListeners();
        }
    }
    
    // スピーチバブルの更新
    setSpeechBubbleActive(active: boolean): void {
        if (this.state.isSpeechBubbleActive !== active) {
            this.state.isSpeechBubbleActive = active;
            this.updateActivity();
            this.notifyListeners();
        }
    }
    
    // アイドル状態の判定
    isIdleForMouseFollow(): boolean {
        // 表情、アニメーション、スピーチバブルが全て非アクティブならアイドル
        const isIdle = !this.state.isExpressionActive && 
               !this.state.isAnimationActive && 
               !this.state.isSpeechBubbleActive;
        
        console.log('[MascotStateManager] isIdleForMouseFollow:', {
            isIdle,
            isExpressionActive: this.state.isExpressionActive,
            activeExpression: this.state.activeExpression,
            isAnimationActive: this.state.isAnimationActive,
            isSpeechBubbleActive: this.state.isSpeechBubbleActive
        });
        
        return isIdle;
    }
    
    // 活動時間の更新
    private updateActivity(): void {
        this.state.lastActivityTime = Date.now();
        this.state.isIdle = this.isIdleForMouseFollow();
    }
    
    // リスナーの登録
    onStateChange(listener: (state: MascotState) => void): () => void {
        this.listeners.push(listener);
        // アンサブスクライブ関数を返す
        return () => {
            const index = this.listeners.indexOf(listener);
            if (index > -1) {
                this.listeners.splice(index, 1);
            }
        };
    }
    
    // リスナーへの通知
    private notifyListeners(): void {
        const currentState = this.getState();
        this.listeners.forEach(listener => {
            try {
                listener(currentState);
            } catch (error) {
                console.error('[MascotStateManager] リスナーエラー:', error);
            }
        });
    }
    
    // デバッグ用
    debug(): void {
        console.log('[MascotStateManager] Current State:', this.state);
    }
}

export function createMascotStateManager(): MascotStateManager {
    return MascotStateManager.getInstance();
}