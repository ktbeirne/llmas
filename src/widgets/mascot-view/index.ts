/**
 * MascotView Widget - Public API
 * FSD Phase 3: MascotView Widgetの公開インターフェース
 */

// Main widget component
export { MascotView } from './ui/MascotView';

// Widget orchestrator
export { MascotOrchestrator } from './model/mascot-orchestrator';

// Widget initialization hook
export const useMascotView = () => {
  return {
    createOrchestrator: () => new MascotOrchestrator()
  };
};