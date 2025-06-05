/**
 * MascotOrchestrator - FSD Phase 3
 * MascotOrchestratorの実装（TDD: GREEN Phase）
 */

import { mouseFollowStore } from '@features/mouse-follow';
import { vrmControlStore } from '@features/vrm-control';
import { animationStore } from '@features/animation';
import { chatStore } from '@features/chat';
import { eventBus } from '@shared/lib/event-bus';
import type { ChatEvents } from '@features/chat';

export class MascotOrchestrator {
  private unsubscribeCallbacks: (() => void)[] = [];

  constructor() {
    this.setupEventHandlers();
    this.setupStoreSubscriptions();
  }

  /**
   * イベントハンドラーの設定
   */
  private setupEventHandlers(): void {
    // チャットメッセージ受信時の表情制御
    const unsubscribeMessageReceived = eventBus.subscribe(
      'chat:message-received' as keyof ChatEvents,
      this.handleChatMessageReceived.bind(this)
    );

    // チャットエラー時の表情制御
    const unsubscribeError = eventBus.subscribe(
      'chat:error' as keyof ChatEvents,
      this.handleChatError.bind(this)
    );

    // アプリケーションエラー時の表情制御
    const unsubscribeAppError = eventBus.subscribe(
      'app:error' as any,
      this.handleApplicationError.bind(this)
    );

    this.unsubscribeCallbacks.push(
      unsubscribeMessageReceived,
      unsubscribeError,
      unsubscribeAppError
    );
  }

  /**
   * Store購読の設定
   */
  private setupStoreSubscriptions(): void {
    // アニメーション状態の監視
    const unsubscribeAnimation = animationStore.subscribe((animationState) => {
      this.handleAnimationStateChange(animationState);
    });

    // チャット状態の監視
    const unsubscribeChat = chatStore.subscribe((chatState) => {
      this.handleChatStateChange(chatState);
    });

    this.unsubscribeCallbacks.push(
      unsubscribeAnimation,
      unsubscribeChat
    );
  }

  /**
   * アニメーション状態変更のハンドリング
   */
  private handleAnimationStateChange(animationState: any): void {
    const mouseFollowState = mouseFollowStore.getState();

    // 非アイドルアニメーション再生時はマウス追従を無効化
    if (animationState.currentAnimation && 
        animationState.currentAnimation.category !== 'idle' && 
        animationState.isPlaying) {
      
      if (mouseFollowState.isEnabled) {
        mouseFollowState.disable('animation-playing');
      }
    } 
    // アニメーション終了時はマウス追従を有効化
    else if (!animationState.isPlaying) {
      mouseFollowState.enable();
    }
  }

  /**
   * チャット状態変更のハンドリング
   */
  private handleChatStateChange(chatState: any): void {
    const vrmState = vrmControlStore.getState();
    
    // VRMが読み込まれていない場合はスキップ
    if (!vrmState.vrm) {
      return;
    }

    if (chatState.isTyping) {
      // タイピング中の思考表情
      vrmState.setExpression?.('thinking', 0.8);
    } else if (chatState.isLoading) {
      // ローディング中の待機表情
      vrmState.setExpression?.('waiting', 0.6);
    } else if (!chatState.error) {
      // 通常状態に戻す
      vrmState.setExpression?.('neutral', 1.0);
    }
  }

  /**
   * チャットメッセージ受信時のハンドリング
   */
  private handleChatMessageReceived(_event: any): void {
    const vrmState = vrmControlStore.getState();
    
    if (vrmState.vrm && vrmState.setExpression) {
      // 嬉しい表情を再生
      vrmState.setExpression('happy', 0.7);
      
      // 3秒後に通常表情に戻す
      setTimeout(() => {
        if (vrmState.vrm && vrmState.setExpression) {
          vrmState.setExpression('neutral', 1.0);
        }
      }, 3000);
    }
  }

  /**
   * チャットエラー時のハンドリング
   */
  private handleChatError(_event: any): void {
    const vrmState = vrmControlStore.getState();
    
    if (vrmState.vrm && vrmState.setExpression) {
      // 困惑した表情を再生
      vrmState.setExpression('confused', 0.8);
      
      // 5秒後に通常表情に戻す
      setTimeout(() => {
        if (vrmState.vrm && vrmState.setExpression) {
          vrmState.setExpression('neutral', 1.0);
        }
      }, 5000);
    }
  }

  /**
   * アプリケーションエラー時のハンドリング
   */
  private handleApplicationError(_event: any): void {
    const vrmState = vrmControlStore.getState();
    
    if (vrmState.vrm && vrmState.setExpression) {
      // 驚いた表情を再生
      vrmState.setExpression('surprised', 0.9);
    }
  }

  /**
   * マニュアル表情制御
   */
  playExpression(expressionName: string, intensity: number = 1.0): void {
    const vrmState = vrmControlStore.getState();
    
    if (vrmState.vrm && vrmState.setExpression) {
      vrmState.setExpression(expressionName, intensity);
    }
  }

  /**
   * マニュアルアニメーション制御
   */
  playAnimation(animationName: string): void {
    const animationState = animationStore.getState();
    
    if (animationState.playAnimation) {
      animationState.playAnimation({
        name: animationName,
        category: 'gesture',
        priority: 'normal',
        isLooping: false,
        canBeInterrupted: true
      });
    }
  }

  /**
   * フィーチャー間の強制同期
   */
  forceSynchronization(): void {
    const mouseFollowState = mouseFollowStore.getState();
    const vrmState = vrmControlStore.getState();
    const animationState = animationStore.getState();

    // アニメーション再生中の場合はマウス追従を無効化
    if (animationState.isPlaying && 
        animationState.currentAnimation?.category !== 'idle') {
      mouseFollowState.disable('force-sync');
    } else {
      mouseFollowState.enable();
    }

    // VRMとマウス追従の同期
    if (mouseFollowState.targetOrientation && vrmState.vrm) {
      vrmState.setHeadOrientation?.(mouseFollowState.targetOrientation);
    }
  }

  /**
   * 統計情報の取得
   */
  getStats(): any {
    return {
      mouseFollow: mouseFollowStore.getState(),
      vrm: {
        isLoaded: !!vrmControlStore.getState().vrm,
        isLoading: vrmControlStore.getState().isLoading,
        error: vrmControlStore.getState().error
      },
      animation: {
        current: animationStore.getState().currentAnimation,
        isPlaying: animationStore.getState().isPlaying
      },
      chat: {
        isActive: chatStore.getState().isLoading || chatStore.getState().isTyping,
        error: chatStore.getState().error
      }
    };
  }

  /**
   * リソースのクリーンアップ
   */
  destroy(): void {
    this.unsubscribeCallbacks.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('[MascotOrchestrator] Error during cleanup:', error);
      }
    });
    
    this.unsubscribeCallbacks = [];
  }
}