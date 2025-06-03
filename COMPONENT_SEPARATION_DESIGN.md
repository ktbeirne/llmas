# Component Separation Design for settings-renderer.ts

## Overview
This document outlines the detailed plan for splitting the 1,429-line settings-renderer.ts file into maintainable components under 500 lines each, achieving a 66% reduction as required by Issue #50.

## Current Analysis
- **Total Lines**: 1,429 lines
- **Target**: Each component < 500 lines
- **Goal**: 66% reduction per component

## Component Breakdown

### 1. WindowSettingsComponent (~120 lines)
**Responsibility**: Window and display settings management
- Window size preset handling (small/medium/large/custom)
- Custom dimension validation (200-1000 width, 300-1200 height)
- VRM model file selection dialog
- Real-time window size preview

**Key Methods**:
- `handlePresetChange()`
- `validateDimensions()`
- `selectVrmModel()`
- `applyDisplaySettings()`

### 2. ChatSettingsComponent (~150 lines)
**Responsibility**: Chat and communication settings
- User name and mascot name management
- System prompt editing with character counting
- Performance warning display (10,000+ characters)
- Chat history clearing with confirmation dialogs

**Key Methods**:
- `updateCharacterCount()`
- `saveChatSettings()`
- `resetSystemPrompt()`
- `clearChatHistory()`

### 3. ExpressionSettingsComponent (~200 lines)
**Responsibility**: VRM expression management (most complex)
- VRM expression discovery and loading with retry logic
- Dynamic expression list rendering with enable/disable toggles
- Default weight sliders with real-time updates
- Expression preview functionality with intensity controls
- Tools.json regeneration and Gemini service restart coordination

**Key Methods**:
- `initializeExpressions()`
- `renderExpressionList()`
- `updateExpressionSetting()`
- `previewExpression()`
- `updateToolsAndReinitializeGemini()`

### 4. ThemeSettingsComponent (~120 lines)
**Responsibility**: Theme management and customization
- Theme card generation and rendering
- Theme selection with live preview capability
- Collapsible section management
- Color palette display and selection

**Key Methods**:
- `renderThemeCards()`
- `selectTheme()`
- `updateThemeSelection()`
- `toggleCollapse()`

### 5. SettingsStateManager (~80 lines)
**Responsibility**: Centralized state and IPC management
- Centralized IPC communication abstraction
- Settings validation and error handling
- Change notification system between components
- Persistence coordination across all settings

**Key Methods**:
- `saveSettings(section, data)`
- `loadSettings(section)`
- `validateSettings(section, data)`
- `subscribe(section, callback)`

### 6. SettingsRenderer (~100 lines)
**Responsibility**: Main controller and orchestration
- Tab management and switching logic
- Component lifecycle management (initialize/dispose)
- Success message coordination between components
- Global error handling and user feedback

**Key Methods**:
- `switchTab(tabName)`
- `initializeComponents()`
- `showSuccessMessage()`
- `setupGlobalClickHandler()`

## Technical Interface Design

### Common Component Interface
```typescript
interface SettingsComponent {
  initialize(): Promise<void>;
  loadSettings(): Promise<void>;
  applySettings(): Promise<void>;
  resetSettings(): Promise<void>;
  getValidationErrors(): ValidationError[];
  dispose(): void;
}
```

### State Management Strategy
```typescript
class SettingsStateManager {
  private settings: {
    window: WindowSettings;
    chat: ChatSettings;
    expressions: ExpressionSettings;
    theme: ThemeSettings;
  };
  
  async saveSettings(section: string, data: any): Promise<Result>;
  async loadSettings(section: string): Promise<any>;
  validateSettings(section: string, data: any): ValidationError[];
  subscribe(section: string, callback: (data: any) => void): void;
  notify(section: string, data: any): void;
}
```

## File Structure
```
src/settings/
├── SettingsRenderer.ts                 (~100 lines)
├── SettingsStateManager.ts            (~80 lines)
├── components/
│   ├── WindowSettingsComponent.ts     (~120 lines)
│   ├── ChatSettingsComponent.ts       (~150 lines)
│   ├── ExpressionSettingsComponent.ts (~200 lines)
│   └── ThemeSettingsComponent.ts      (~120 lines)
├── interfaces/
│   ├── SettingsInterfaces.ts
│   └── ValidationTypes.ts
└── utils/
    ├── SettingsValidation.ts
    └── SettingsHelpers.ts
```

## TDD Implementation Strategy

### Test Structure
```
src/settings/__tests__/
├── SettingsRenderer.test.ts
├── SettingsStateManager.test.ts
└── components/
    ├── WindowSettingsComponent.test.ts
    ├── ChatSettingsComponent.test.ts
    ├── ExpressionSettingsComponent.test.ts
    └── ThemeSettingsComponent.test.ts
```

### Implementation Sequence (TDD Red-Green-Refactor)
1. **Phase 2-3**: Write comprehensive functionality preservation tests
2. **Phase 2-4**: WindowSettingsComponent (simplest component)
3. **Phase 2-5**: ChatSettingsComponent
4. **Phase 2-6**: ThemeSettingsComponent
5. **Phase 2-7**: ExpressionSettingsComponent (most complex)
6. **Phase 2-8**: SettingsStateManager (central coordination)

### Key Testing Categories
1. **Functionality Preservation**: Ensure all current IPC communication works
2. **Component Integration**: Verify state manager coordination
3. **User Interface**: Validate tab switching and success messages
4. **Performance**: Monitor memory usage and initialization time
5. **Regression**: Ensure no loss of existing functionality

## Success Metrics
- ✅ Each separated file < 500 lines (66% reduction achieved)
- ✅ All existing functionality preserved through testing
- ✅ Improved maintainability with single responsibility principle
- ✅ Enhanced testability with isolated components
- ✅ Better code organization and readability

## Migration Benefits
1. **Maintainability**: Easier to modify individual settings sections
2. **Testing**: Components can be tested in isolation
3. **Performance**: Lazy loading potential for complex components
4. **Scalability**: Easy to add new settings sections
5. **Code Quality**: Clear separation of concerns and responsibilities

---
*This design ensures compliance with Issue #50 requirements while maintaining all existing functionality and following CLAUDE.md development guidelines.*