/**
 * Mouse Follow Store - FSD Phase 2
 * マウス追従機能の状態管理
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { eventBus } from '@shared/lib/app-event-bus';
import { 
  MousePosition, 
  HeadOrientation, 
  MouseFollowSettings,
  MouseFollowState 
} from '../types';
import { calculateHeadOrientation, smoothOrientation } from '../lib/calculations';

interface MouseFollowStore extends MouseFollowState {
  // Actions
  updateSettings: (settings: Partial<MouseFollowSettings>) => void;
  updateMousePosition: (position: MousePosition) => void;
  setOrientation: (orientation: HeadOrientation | null) => void;
  toggle: () => void;
  reset: () => void;
  
  // Tracking control
  startTracking: () => void;
  stopTracking: () => void;
  
  // Permission
  setPermission: (granted: boolean, error?: string) => void;
  
  // Internal
  _animationFrame: number | null;
}

export const useMouseFollowStore = create<MouseFollowStore>()(
  subscribeWithSelector((set, get) => ({
    // Default settings
    enabled: true,
    sensitivity: 0.5,
    smoothing: 0.8,
    deadZone: 50,
    updateFrequency: 16, // ~60fps
    
    // Runtime state
    isTracking: false,
    currentPosition: null,
    targetOrientation: null,
    smoothedOrientation: null,
    
    // Permission state
    hasPermission: false,
    permissionError: null,
    
    // Internal
    _animationFrame: null,
    
    updateSettings: (settings) => {
      set((state) => ({ ...state, ...settings }));
      
      eventBus.emit('settings:changed', {
        category: 'mouse-follow',
        key: 'bulk',
        value: settings
      });
    },
    
    updateMousePosition: (position) => {
      const state = get();
      if (!state.enabled || !state.isTracking) return;
      
      set({ currentPosition: position });
      
      // 新しい目標方向を計算
      const targetOrientation = calculateHeadOrientation(
        position,
        state.sensitivity,
        state.deadZone
      );
      
      if (targetOrientation) {
        set({ targetOrientation });
        
        // スムージング処理
        if (!state._animationFrame) {
          const animate = () => {
            const current = get();
            if (!current.enabled || !current.isTracking) {
              set({ _animationFrame: null });
              return;
            }
            
            const smoothed = smoothOrientation(
              current.smoothedOrientation,
              current.targetOrientation,
              current.smoothing
            );
            
            set({ smoothedOrientation: smoothed });
            
            if (smoothed) {
              eventBus.emit('mouse-follow:orientation-changed', smoothed);
            }
            
            set({ _animationFrame: requestAnimationFrame(animate) });
          };
          
          set({ _animationFrame: requestAnimationFrame(animate) });
        }
      }
      
      // 位置変更イベント
      eventBus.emit('mouse-follow:position-changed', position);
    },
    
    setOrientation: (orientation) => {
      set({ targetOrientation: orientation });
    },
    
    startTracking: () => {
      const state = get();
      if (!state.enabled || !state.hasPermission) return;
      
      set({ isTracking: true });
      eventBus.emit('mouse-follow:tracking-started', {});
    },
    
    stopTracking: () => {
      const frame = get()._animationFrame;
      if (frame) {
        cancelAnimationFrame(frame);
      }
      
      set({ 
        isTracking: false,
        _animationFrame: null
      });
      
      eventBus.emit('mouse-follow:tracking-stopped', {});
    },
    
    setPermission: (granted, error) => {
      set({
        hasPermission: granted,
        permissionError: error || null
      });
      
      if (!granted && get().isTracking) {
        get().stopTracking();
      }
      
      eventBus.emit('mouse-follow:permission-changed', { granted, error });
    },
    
    toggle: () => {
      const newState = !get().enabled;
      set({ enabled: newState });
      
      if (!newState) {
        get().stopTracking();
      }
      
      eventBus.emit('mouse-follow:enabled', { enabled: newState });
    },
    
    reset: () => {
      const frame = get()._animationFrame;
      if (frame) {
        cancelAnimationFrame(frame);
      }
      
      set({
        isTracking: false,
        currentPosition: null,
        targetOrientation: null,
        smoothedOrientation: null,
        _animationFrame: null
      });
    }
  }))
);