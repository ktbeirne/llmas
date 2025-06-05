/**
 * Animation Manager - FSD Phase 2
 * VRMアニメーション管理機能
 */

import * as THREE from 'three';
import type { VRM } from '@pixiv/three-vrm';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import { createVRMAnimationClip } from '@pixiv/three-vrm-animation';

export class AnimationManager {
  private animationMixer: THREE.AnimationMixer | null = null;
  private animationClip: THREE.AnimationClip | null = null;
  private animationAction: THREE.AnimationAction | null = null;
  private currentAnimation: VRMAnimation | null = null;
  private isAnimationPlaying = false;
  private isAnimationPaused = false;

  /**
   * AnimationMixerを初期化
   */
  initialize(vrm: VRM, animation: VRMAnimation | null): boolean {
    if (!animation) {
      console.warn('[AnimationManager] アニメーションが提供されていません');
      return false;
    }

    try {
      // AnimationMixerを作成
      this.animationMixer = new THREE.AnimationMixer(vrm.scene);
      this.currentAnimation = animation;
      
      // VRMAnimationClip作成
      const clip = createVRMAnimationClip(animation, vrm);
      
      if (!clip) {
        console.error('[AnimationManager] AnimationClipの生成に失敗');
        this.dispose();
        return false;
      }
      
      this.animationClip = clip;
      this.animationAction = this.animationMixer.clipAction(clip);
      
      console.log(`[AnimationManager] アニメーション「${clip.name}」を初期化しました`);
      console.log(`[AnimationManager] アイドルアニメーション: ${this.isIdleAnimation()}`);
      
      return true;
    } catch (error) {
      console.error('[AnimationManager] 初期化エラー:', error);
      this.dispose();
      return false;
    }
  }

  /**
   * アニメーションを再生
   */
  play(): boolean {
    if (!this.animationAction) {
      console.error('[AnimationManager] AnimationActionが初期化されていません');
      return false;
    }

    this.animationAction.play();
    this.isAnimationPlaying = true;
    this.isAnimationPaused = false;
    
    console.log(`[AnimationManager] アニメーション「${this.animationClip?.name}」を再生開始`);
    return true;
  }

  /**
   * アニメーションを停止
   */
  stop(): void {
    if (this.animationAction) {
      this.animationAction.stop();
      this.isAnimationPlaying = false;
      this.isAnimationPaused = false;
      
      console.log('[AnimationManager] アニメーションを停止しました');
    }
  }

  /**
   * アニメーションを一時停止
   */
  pause(): void {
    if (this.animationAction && this.isAnimationPlaying) {
      this.animationAction.paused = true;
      this.isAnimationPlaying = false;
      this.isAnimationPaused = true;
      
      console.log('[AnimationManager] アニメーションを一時停止しました');
    }
  }

  /**
   * アニメーションを再開
   */
  resume(): void {
    if (this.animationAction && this.isAnimationPaused) {
      this.animationAction.paused = false;
      this.isAnimationPlaying = true;
      this.isAnimationPaused = false;
      
      console.log('[AnimationManager] アニメーションを再開しました');
    }
  }

  /**
   * 再生速度を設定
   */
  setPlaybackSpeed(speed: number): void {
    if (this.animationAction) {
      // 0.1〜5.0の範囲に制限
      const clampedSpeed = Math.max(0.1, Math.min(5.0, speed));
      this.animationAction.timeScale = clampedSpeed;
      
      console.log(`[AnimationManager] 再生速度を ${clampedSpeed}x に設定`);
    }
  }

  /**
   * アニメーション更新
   */
  update(delta: number): void {
    if (this.animationMixer) {
      this.animationMixer.update(delta);
    }
  }

  /**
   * 現在のアニメーションがアイドルアニメーションかどうか
   */
  isIdleAnimation(): boolean {
    if (!this.animationClip) return true;
    
    const name = this.animationClip.name.toLowerCase();
    
    // アニメーション名が空、または特定のパターンに一致する場合はアイドルとみなす
    return !name || 
           name === '' || 
           name.includes('idle') ||
           name === 'take 001' || // デフォルトのアニメーション名
           name === 'mixamo.com' || // Mixamoのデフォルト名
           name === 'clip'; // デフォルトクリップ名
  }

  /**
   * 現在のアニメーション名を取得
   */
  getCurrentAnimationName(): string | null {
    return this.animationClip?.name || null;
  }

  /**
   * 初期化されているかどうか
   */
  isInitialized(): boolean {
    return this.animationMixer !== null && this.animationClip !== null;
  }

  /**
   * 再生中かどうか
   */
  isPlaying(): boolean {
    return this.isAnimationPlaying;
  }

  /**
   * 一時停止中かどうか
   */
  isPaused(): boolean {
    return this.isAnimationPaused;
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    if (this.animationMixer) {
      this.animationMixer.stopAllAction();
      this.animationMixer.uncacheRoot(this.animationMixer.getRoot());
      this.animationMixer.dispose();
      this.animationMixer = null;
    }
    
    this.animationClip = null;
    this.animationAction = null;
    this.currentAnimation = null;
    this.isAnimationPlaying = false;
    this.isAnimationPaused = false;
    
    console.log('[AnimationManager] リソースをクリーンアップしました');
  }
}