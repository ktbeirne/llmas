/**
 * VRM Store - FSD Phase 2
 * VRM制御機能の状態管理
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { eventBus } from '@shared/lib/app-event-bus';
import type { VRM } from '@pixiv/three-vrm';
import type { VRMAnimation } from '@pixiv/three-vrm-animation';
import * as THREE from 'three';
import { 
  VRMModelState, 
  VRMExpressionInfo,
  VRMExpressionChangeEvent 
} from '../types';

interface VRMStore extends VRMModelState {
  // Actions
  setVRM: (vrm: VRM | null, modelUrl?: string) => void;
  setLoading: (loading: boolean) => void;
  setLoadError: (error: string | null) => void;
  
  // Animation
  setAnimation: (animation: VRMAnimation | null, animationUrl?: string) => void;
  setAnimationClip: (clip: THREE.AnimationClip | null) => void;
  setAnimationMixer: (mixer: THREE.AnimationMixer | null) => void;
  setAnimationPlaying: (playing: boolean) => void;
  
  // Expression
  applyExpression: (expressionName: string, intensity?: number) => boolean;
  resetAllExpressions: () => void;
  getAvailableExpressions: () => VRMExpressionInfo[];
  
  // LookAt
  toggleLookAt: () => void;
  setLookAtTarget: (target: THREE.Object3D | null) => void;
  
  // Blink
  toggleBlink: () => void;
  setBlinkInterval: (interval: number) => void;
  
  // Utils
  reset: () => void;
}

const initialState: VRMModelState = {
  // モデル
  vrm: null,
  modelUrl: null,
  isLoading: false,
  loadError: null,
  
  // アニメーション
  currentAnimation: null,
  animationUrl: null,
  animationClip: null,
  animationMixer: null,
  isAnimationPlaying: false,
  
  // 表情
  currentExpression: null,
  expressionIntensity: 1.0,
  
  // LookAt
  lookAtEnabled: true,
  lookAtTarget: null,
  
  // まばたき
  blinkEnabled: true,
  blinkInterval: 3000
};

export const useVRMStore = create<VRMStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    setVRM: (vrm, modelUrl) => {
      set({ 
        vrm, 
        modelUrl: modelUrl || null,
        isLoading: false,
        loadError: null
      });
      
      if (vrm && modelUrl) {
        eventBus.emit('vrm:model-loaded', { modelPath: modelUrl });
      }
    },
    
    setLoading: (loading) => {
      set({ isLoading: loading });
    },
    
    setLoadError: (error) => {
      set({ 
        loadError: error,
        isLoading: false
      });
    },
    
    setAnimation: (animation, animationUrl) => {
      set({ 
        currentAnimation: animation,
        animationUrl: animationUrl || null
      });
    },
    
    setAnimationClip: (clip) => {
      set({ animationClip: clip });
    },
    
    setAnimationMixer: (mixer) => {
      set({ animationMixer: mixer });
    },
    
    setAnimationPlaying: (playing) => {
      const state = get();
      set({ isAnimationPlaying: playing });
      
      if (playing) {
        eventBus.emit('vrm:animation-started', {
          name: state.animationClip?.name || '',
          isIdle: false // TODO: idle判定の実装
        });
      } else {
        eventBus.emit('vrm:animation-ended', {
          name: state.animationClip?.name || ''
        });
      }
    },
    
    applyExpression: (expressionName, intensity = 1.0) => {
      const vrm = get().vrm;
      if (!vrm?.expressionManager) {
        return false;
      }
      
      const expression = vrm.expressionManager.getExpression(expressionName);
      if (!expression) {
        return false;
      }
      
      const weight = Math.max(0, Math.min(1, intensity));
      
      // 他の表情をリセット（blinkとlook系以外）
      if (!expressionName.startsWith('blink') && !expressionName.startsWith('look')) {
        const allExpressions = vrm.expressionManager.expressionMap;
        Object.keys(allExpressions).forEach(name => {
          if (!name.startsWith('blink') && !name.startsWith('look')) {
            vrm.expressionManager!.setValue(name, 0.0);
          }
        });
      }
      
      // 指定された表情を適用
      vrm.expressionManager.setValue(expressionName, weight);
      
      set({
        currentExpression: expressionName,
        expressionIntensity: weight
      });
      
      eventBus.emit('vrm:expression-changed', {
        expression: expressionName,
        intensity: weight
      });
      
      return true;
    },
    
    resetAllExpressions: () => {
      const vrm = get().vrm;
      if (!vrm?.expressionManager) return;
      
      const allExpressions = vrm.expressionManager.expressionMap;
      Object.keys(allExpressions).forEach(name => {
        if (!name.startsWith('blink')) {
          vrm.expressionManager!.setValue(name, 0.0);
        }
      });
      
      set({
        currentExpression: null,
        expressionIntensity: 1.0
      });
    },
    
    getAvailableExpressions: () => {
      const vrm = get().vrm;
      if (!vrm?.expressionManager) {
        return [];
      }
      
      const expressions: VRMExpressionInfo[] = [];
      const allExpressions = vrm.expressionManager.expressionMap;
      const customExpressions = vrm.expressionManager.customExpressionMap || {};
      
      Object.keys(allExpressions).forEach(name => {
        const isPreset = !Object.prototype.hasOwnProperty.call(customExpressions, name);
        expressions.push({
          name,
          displayName: getExpressionDisplayName(name),
          isPreset
        });
      });
      
      return expressions;
    },
    
    toggleLookAt: () => {
      set(state => ({ lookAtEnabled: !state.lookAtEnabled }));
    },
    
    setLookAtTarget: (target) => {
      set({ lookAtTarget: target });
    },
    
    toggleBlink: () => {
      set(state => ({ blinkEnabled: !state.blinkEnabled }));
    },
    
    setBlinkInterval: (interval) => {
      set({ blinkInterval: interval });
    },
    
    reset: () => {
      const state = get();
      
      // クリーンアップ
      if (state.animationMixer) {
        state.animationMixer.stopAllAction();
        state.animationMixer.dispose();
      }
      
      set(initialState);
    }
  }))
);

/**
 * 表情の表示名を取得（日本語名があれば使用）
 */
function getExpressionDisplayName(name: string): string {
  const displayNames: { [key: string]: string } = {
    'happy': '喜び',
    'sad': '悲しみ',
    'angry': '怒り',
    'surprised': '驚き',
    'relaxed': 'リラックス',
    'neutral': 'ニュートラル',
    'blink': 'まばたき',
    'blinkLeft': '左まばたき',
    'blinkRight': '右まばたき',
    'lookUp': '上を見る',
    'lookDown': '下を見る',
    'lookLeft': '左を見る',
    'lookRight': '右を見る'
  };
  
  return displayNames[name] || name;
}