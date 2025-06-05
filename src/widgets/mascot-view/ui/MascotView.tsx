/**
 * MascotView Widget - FSD Phase 3
 * MascotView Widgetの実装（TDD: GREEN Phase）
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { useMouseFollow } from '@features/mouse-follow';
import { useVRMControl } from '@features/vrm-control';
import { useAnimation } from '@features/animation';
import { useChat } from '@features/chat';

interface MascotViewProps {
  className?: string;
  showOverlay?: boolean;
}

export const MascotView: React.FC<MascotViewProps> = ({ 
  className = 'w-full h-full relative',
  showOverlay = true 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Feature stores
  const mouseFollow = useMouseFollow();
  const vrmControl = useVRMControl();
  const animation = useAnimation();
  const chat = useChat();
  
  // Local state for performance optimization
  const [animationState, setAnimationState] = useState(() => 
    animation.store.getState()
  );
  const [chatState, setChatState] = useState(() => 
    chat.store.getState()
  );

  // Feature間調整ロジック
  useEffect(() => {
    // アニメーション状態の変更を監視
    const unsubscribeAnimation = animation.store.subscribe((newState) => {
      setAnimationState(newState);
      
      // 非アイドルアニメーション再生時はマウス追従を無効化
      if (newState.currentAnimation && 
          newState.currentAnimation.category !== 'idle' && 
          newState.isPlaying) {
        mouseFollow.disable('animation-playing');
      } else if (!newState.isPlaying) {
        mouseFollow.enable();
      }
    });

    return unsubscribeAnimation;
  }, [mouseFollow]);

  // チャット状態の監視
  useEffect(() => {
    const unsubscribeChat = chat.store.subscribe((newState) => {
      setChatState(newState);
      
      // チャット応答受信時の表情制御
      if (newState.isTyping) {
        // タイピング中の表情
        vrmControl.setExpression?.('thinking', 0.8);
      } else if (!newState.isLoading && !newState.error) {
        // 通常状態に戻す
        vrmControl.setExpression?.('neutral', 1.0);
      }
    });

    return unsubscribeChat;
  }, [vrmControl]);

  // マウス追従とVRM制御の統合
  useEffect(() => {
    if (mouseFollow.targetOrientation && vrmControl.vrm) {
      vrmControl.setHeadOrientation(mouseFollow.targetOrientation);
    }
  }, [mouseFollow.targetOrientation, vrmControl.vrm, vrmControl.setHeadOrientation]);

  // エラーハンドリング
  const handleError = useCallback((error: Error) => {
    console.error('[MascotView] Error:', error);
    // エラー時の表情制御
    vrmControl.setExpression?.('confused', 0.7);
  }, [vrmControl]);

  return (
    <div className={className}>
      <Canvas
        ref={canvasRef}
        camera={{ position: [0, 1.5, 3], fov: 50 }}
        gl={{ alpha: true, antialias: true }}
        onError={handleError}
        performance={{ min: 0.8 }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        
        {/* VRM Model */}
        {vrmControl.vrm && (
          <primitive object={vrmControl.vrm.scene} />
        )}
      </Canvas>
      
      {/* UI Overlay */}
      {showOverlay && (
        <div className="absolute top-4 right-4 space-y-2 pointer-events-none">
          {/* Status indicators */}
          <div className="bg-black/20 text-white text-sm px-2 py-1 rounded backdrop-blur-sm">
            Mouse Follow: {mouseFollow.isEnabled ? 'ON' : 'OFF'}
          </div>
          
          <div className="bg-black/20 text-white text-sm px-2 py-1 rounded backdrop-blur-sm">
            Animation: {animationState.currentAnimation?.name || 'None'}
          </div>
          
          {/* Chat status */}
          {chatState.isLoading && (
            <div className="bg-blue-500/20 text-blue-100 text-sm px-2 py-1 rounded backdrop-blur-sm">
              Loading...
            </div>
          )}
          
          {chatState.isTyping && (
            <div className="bg-green-500/20 text-green-100 text-sm px-2 py-1 rounded backdrop-blur-sm">
              Typing...
            </div>
          )}
          
          {/* VRM Error */}
          {vrmControl.error && (
            <div className="bg-red-500/20 text-red-100 text-sm px-2 py-1 rounded backdrop-blur-sm">
              Error: {vrmControl.error}
            </div>
          )}
          
          {/* Performance stats */}
          {process.env.NODE_ENV === 'development' && (
            <>
              <div className="bg-purple-500/20 text-purple-100 text-sm px-2 py-1 rounded backdrop-blur-sm">
                FPS: {vrmControl.stats?.fps || '--'}
              </div>
              
              {mouseFollow.getStats && (
                <div className="bg-cyan-500/20 text-cyan-100 text-sm px-2 py-1 rounded backdrop-blur-sm">
                  Accuracy: {(mouseFollow.getStats().accuracy * 100).toFixed(1)}%
                </div>
              )}
            </>
          )}
        </div>
      )}
      
      {/* Loading overlay */}
      {vrmControl.isLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
          <div className="text-white text-lg font-medium">
            Loading VRM Model...
          </div>
        </div>
      )}
    </div>
  );
};