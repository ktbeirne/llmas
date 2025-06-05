# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application that creates an interactive AI-powered desktop mascot. The mascot is rendered as a 3D VRM model and can interact with users through chat and speech bubbles.

## Architecture

### High-Level Overview
The application follows **Feature-Sliced Design (FSD)** principles with event-driven architecture for optimal maintainability and developer experience. 

📋 **For complete architectural documentation, see [docs/README.md](./docs/README.md) - ドキュメントインデックス**

### Core Architectural Principles
- **Feature-Sliced Design**: Feature-first organization with clear public APIs
- **Event-Driven Architecture**: Loose coupling through type-safe event bus
- **Hybrid UI Approach**: React for settings/chat UI, Three.js for VRM rendering
- **Test-Driven Development**: TDD mandatory for all implementations

### Layer Structure
```
App (Initialization) → Widgets (Feature Composition) → Features (Core Logic)
↑                                                                        ↓
Shared (Common Resources) ← Entities (Business Objects)
```

### Multi-Window Hybrid Architecture
- **Main Window**: Three.js + MascotView Widget (3D VRM rendering)
- **Settings Window**: React + SettingsPanel Widget
- **Chat Window**: React + Chat Feature
- **Speech Bubble Window**: Vanilla JavaScript (floating bubble)

### Key Components (FSD Structure)
- `src/app/`: Application initialization and global providers
- `src/features/`: Core business features
  - `mouse-follow/`: Mouse tracking and head orientation
  - `vrm-control/`: VRM model control and animations
  - `chat/`: Chat functionality with Gemini AI
  - `settings/`: Configuration management
  - `animation/`: Animation control and categorization
  - `mcp-integration/`: MCP server integration
- `src/widgets/`: Feature composition and coordination
  - `mascot-view/`: Main 3D view with feature integration
  - `settings-panel/`: Unified settings interface
- `src/shared/`: Common utilities and UI components
  - `ui/`: Reusable UI components
  - `lib/`: Common utilities and event bus
  - `types/`: Shared type definitions
- `src/entities/`: Core business entities

## Common Commands

📋 **For complete command reference, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)**

### Key Development Commands
```bash
npm start                 # Start the application in development mode
npm run lint             # Run ESLint on TypeScript files
npm run test             # Run all tests (TDD requirement)
```

## 行動ルール原則

⚠️ **MANDATORY - 全ての実装において以下の原則を厳守すること**

### 🔍 **実装前原則 (BEFORE Implementation)**
1. **📋 ドキュメント確認必須**: 実装前に必ず以下を確認
   - **[docs/README.md](./docs/README.md) ドキュメントインデックス**で関連文書を特定
   - **FSD実装ルール**: インデックスの「アーキテクチャ」→「FSD開発ガイドライン」
   - **アーキテクチャ設計**: インデックスの「アーキテクチャ」→「FSDアーキテクチャ設計」  
   - **実装パターン**: インデックスの「実装時参考文書」→「実装パターン集」

2. **🔧 設計チェックリスト実行**: **[docs/development/DESIGN_CHECKLIST.md](./docs/development/DESIGN_CHECKLIST.md)** のすべての項目を確認
   - アーキテクチャ設計確認
   - 依存関係設計検証
   - エラーハンドリング設計
   - テスタビリティ設計

3. **🚨 TDD必須**: Write tests BEFORE writing implementation code ⚠️ **NON-NEGOTIABLE** ⚠️

4. **📝 計画立案**: 実装計画を明確化（影響ファイル・課題・エッジケース）

### ⌨️ **実装中原則 (DURING Implementation)**
1. **🔧 実装チェックリスト実行**: **[docs/development/IMPLEMENTATION_CHECKLIST.md](./docs/development/IMPLEMENTATION_CHECKLIST.md)** のすべての項目を確認
   - TDD実践確認（Red→Green→Refactor）
   - コード品質基準遵守
   - アーキテクチャ遵守確認
   - エラーハンドリング実装
   - 静的解析クリア

2. **🧪 継続的テスト**: 実装中の各段階でテスト実行
   - Red Phase: 失敗するテストを先に作成
   - Green Phase: テストを通すための最小実装
   - Refactor Phase: テスト保持しながらコード改善

### 🔄 **実装後原則 (AFTER Implementation)**
1. **📋 ドキュメント更新必須**: 実装後に必ず関連ドキュメントを更新
   - **API変更** → インデックスの「新規開発者向け」→「API仕様書」を更新
   - **新機能追加** → インデックスの「新規開発者向け」→「開発環境セットアップ」を更新
   - **アーキテクチャ変更** → インデックスの「アーキテクチャ」→該当するFSD文書を更新
   - **テスト戦略変更** → インデックスの「各モジュール固有ドキュメント」→「テスト関連」を更新

2. **✅ 動作確認**: 全テスト実行とリンター確認

3. **🔄 継続的品質**: コードレビュー基準遵守

## Development Requirements

📋 **For setup and development guide, see [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) and [docs/README.md](./docs/README.md)**

**Additional Requirements**:

1. **User Interaction Language**: All interactions with the user (e.g., comments in code, pull request descriptions, chat responses if applicable) must be in Japanese.

2. After receiving tool results, carefully reflect on their quality and determine optimal next steps before proceeding. Use your thinking to plan and iterate based on this new information, and then take the best next action.

3. For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.

4. **Don't hold back. Give it your all.**

## Architecture Guidelines

**IMPORTANT**: This application follows Feature-Sliced Design (FSD) with event-driven architecture. When adding new features or modifying existing code:

1. **Feature Isolation**: Each feature is self-contained with clear public API (`index.ts`)
2. **Event-Driven Communication**: Use the type-safe event bus for cross-feature communication
3. **Public API Only**: Never import internal feature files directly
4. **Hybrid UI Approach**: React for settings/chat UI, Three.js for VRM rendering
5. **Shared Resources**: Use `src/shared/` for common utilities and UI components
6. **Widget Composition**: Use widgets to compose multiple features
7. **Test Strategy**: Write tests FIRST (TDD), test features in isolation with proper event mocking

### ⚠️ CRITICAL ARCHITECTURE VIOLATIONS TO AVOID ⚠️

**The following violations MUST NOT occur in Feature-Sliced Design:**

1. **❌ NEVER import feature internals directly**
   - Example of violation: `import { mouseStore } from '../mouse-follow/model/store'`
   - ✅ Correct approach: `import { useMouseFollow } from '@features/mouse-follow'`

2. **❌ NEVER skip TDD for "quick implementation"**
   - Example of violation: Implementing features without tests first
   - ✅ Correct approach: RED → GREEN → REFACTOR cycle, no exceptions

3. **❌ NEVER put business logic in shared layer**
   - Example of violation: Feature-specific logic in `src/shared/lib/`
   - ✅ Correct approach: Business logic belongs in feature's `model/` or `lib/`

4. **❌ NEVER create circular dependencies between features**
   - Example of violation: Feature A imports Feature B, Feature B imports Feature A
   - ✅ Correct approach: Use event bus or move shared logic to `entities/`

5. **❌ NEVER implement features without reading FSD docs first**
   - Example of violation: Implementing without understanding FSD structure
   - ✅ Correct approach: Study FSD docs, plan feature structure, then code

**Remember**: Feature-Sliced Design prioritizes maintainability and developer experience. Each feature should be independently developable and testable.

**Key Files to Understand**:
📋 **See [docs/README.md](./docs/README.md) for complete documentation guide - especially the "⭐ 必読ドキュメント" section**

- `src/app/`: Application initialization and global state
- `src/shared/lib/event-bus.ts`: Type-safe event communication system
- `src/features/*/index.ts`: Feature public APIs
- `src/widgets/`: Feature composition and coordination

**Before implementing new features**:
1. 📋 **Check [docs/README.md](./docs/README.md) for current documentation to read**
2. Understand which layer the feature belongs to (app/features/shared/widgets/entities)
3. Write failing tests FIRST (TDD Red phase)
4. Design the feature's public API (`index.ts`)
5. Consider event-driven communication patterns
6. Follow the established FSD naming conventions
7. Ensure proper separation between UI and business logic

## UI/UX Design Guidelines

### Color Usage Philosophy

**Fixed Color Palette Approach Discontinued**: Individual predefined color palettes are no longer used. Instead, we follow a dynamic, context-aware color strategy that prioritizes accessibility, user experience, and system integration.

### 1. Color Contrast and Accessibility Standards

**WCAG Compliance Requirements**:
- **WCAG AA (Minimum)**: Contrast ratio of 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold)
- **WCAG AAA (Enhanced)**: Contrast ratio of 7:1 for normal text, 4.5:1 for large text - **preferred standard**
- **Interactive Elements**: Minimum 3:1 contrast ratio for UI components and graphical objects

**Contrast Validation Process**:
```typescript
// Example contrast checking implementation
const validateColorContrast = (foreground: string, background: string, textSize: 'normal' | 'large'): boolean => {
  const ratio = calculateContrastRatio(foreground, background);
  const minRatio = textSize === 'large' ? 4.5 : 7.0; // AAA standard
  return ratio >= minRatio;
};
```

**Tools for Verification**:
- Use WebAIM Contrast Checker or similar tools during development
- Implement automated contrast testing in CI/CD pipeline
- Regular accessibility audits with screen readers

### 2. System-Integrated Color Strategy

**Adaptive Color Scheme**:
- **System Theme Awareness**: Automatically adapt to user's OS light/dark mode preferences
- **Dynamic Contrast**: Adjust color intensity based on background context
- **Environmental Adaptation**: Consider desktop wallpaper and ambient lighting conditions

**Color Harmony Principles**:
- **Semantic Consistency**: Use consistent color meanings across all windows
  - Success: Green tones (ensure sufficient contrast)
  - Warning: Orange/yellow tones (ensure sufficient contrast)
  - Error: Red tones (ensure sufficient contrast)
  - Information: Blue tones (ensure sufficient contrast)
- **Contextual Appropriateness**: Colors should complement, not compete with user's desktop environment

### 3. Cross-Window Color Unification

**Unified Color System**:
```typescript
interface ColorSystem {
  primary: {
    main: string;
    contrast: string;    // Ensures text readability
    hover: string;       // Interactive state
    disabled: string;    // Non-interactive state
  };
  secondary: {
    main: string;
    contrast: string;
    hover: string;
    disabled: string;
  };
  background: {
    default: string;
    paper: string;       // Elevated surfaces
    overlay: string;     // Modal/popup backgrounds
  };
  text: {
    primary: string;     // High emphasis text
    secondary: string;   // Medium emphasis text
    disabled: string;    // Low emphasis text
    hint: string;        // Placeholder text
  };
}
```

**Multi-Window Consistency**:
- **Main Window**: Transparent/translucent design respecting system colors
- **Chat Window**: High contrast for text readability with consistent semantic colors
- **Settings Window**: Standard system UI colors with accessibility compliance
- **Speech Bubble**: Adaptive colors ensuring visibility against any desktop background

### 4. Enhanced Desktop Integration

**Visual Harmony with Desktop Environment**:
- **Transparency Strategy**: Use alpha channels thoughtfully to maintain readability
- **Borderless Design**: Seamless integration without hard visual boundaries
- **Adaptive Opacity**: Dynamic adjustment based on background content and user activity
- **Shadow and Depth**: Subtle visual cues that enhance presence without obstruction

**Non-Intrusive Interface Principles**:
- **Contextual Visibility**: Show UI elements only when needed
- **Fade Behaviors**: Smooth transitions for appearing/disappearing elements
- **Respect User Workflow**: Never obstruct important desktop areas
- **Smart Positioning**: Avoid overlapping with active applications

### 5. User Experience-Centered Color Decisions

**Cognitive Load Reduction**:
- **Visual Hierarchy**: Use color intensity and contrast to guide attention
- **Information Architecture**: Consistent color coding for navigation and status
- **Error Prevention**: Clear visual feedback for all interactive states

**Emotional Design Considerations**:
- **Friendly and Approachable**: Warm, inviting colors that encourage interaction
- **Professional and Trustworthy**: Appropriate color choices for AI assistant context
- **Culturally Sensitive**: Avoid colors with negative cultural associations

**Accessibility Beyond Color**:
- **Pattern and Texture**: Don't rely solely on color to convey information
- **Size and Position**: Use multiple visual cues for important information
- **Animation and Motion**: Respect user preferences for reduced motion

### 6. Implementation Guidelines

**Color Definition and Management**:
```css
/* CSS Custom Properties for dynamic theming */
:root {
  --color-primary: oklch(65% 0.2 250);
  --color-primary-contrast: oklch(20% 0.02 250);
  --color-background-adaptive: color-mix(in oklch, var(--system-background) 80%, transparent);
}

/* Dark mode adaptations */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: oklch(75% 0.15 250);
    --color-primary-contrast: oklch(90% 0.02 250);
  }
}
```

**Development Workflow**:
1. **Design Review**: All color choices must pass contrast validation
2. **Cross-Window Testing**: Verify consistency across all application windows
3. **Accessibility Audit**: Regular testing with assistive technologies
4. **User Testing**: Validate color choices with actual users in various environments

**Quality Assurance Checklist**:
- [ ] All text meets WCAG AAA contrast requirements
- [ ] Interactive elements have clear visual feedback
- [ ] Color meanings are consistent across all windows
- [ ] Design adapts appropriately to system light/dark mode
- [ ] No information is conveyed through color alone
- [ ] Design integrates harmoniously with desktop environment

## Testing Guidelines

### 🚨 CRITICAL: Test-Driven Development (TDD) MUST BE FOLLOWED 🚨

**WARNING**: TDD violations have been frequent. This is MANDATORY, not optional.

#### TDD Enforcement Rules:
1. **🔴 RED**: Write a failing test FIRST - before any implementation code
2. **🟢 GREEN**: Write minimal code to make the test pass - no more, no less  
3. **🔵 REFACTOR**: Clean up code while keeping tests green
4. **❌ NO EXCEPTIONS**: Implementation without tests will be rejected

#### TDD Compliance Checklist:
- [ ] Test written before implementation? (RED phase)
- [ ] Test initially fails as expected? (Confirms test validity)
- [ ] Implementation makes test pass? (GREEN phase)
- [ ] Code cleaned up with tests still passing? (REFACTOR phase)
- [ ] All tests run and pass before PR submission?

### General Principles
* **MANDATORY TDD**: Every line of production code must be written to make a failing test pass
* **Test Coverage**: All new features, enhancements, and bug fixes must be accompanied by relevant tests
* **Green Gate**: Immediately after writing implementation code to make the tests pass (the "Green" step of TDD), explicitly run and confirm that all relevant unit and integration tests are passing. This verification must occur before any refactoring is performed and before a pull request is created
* **Test Quality**: Write tests that are clear, concise, maintainable, and run reliably, especially in CI/CD environments
* **Language Consistency**: Test descriptions (e.g., it('should do X when Y')) and any significant comments within test files should be written in English for consistency and broader understanding

### Unit & Integration Tests (Vitest)
* **File Location**: Place Vitest test files (e.g., *.test.ts, *.spec.ts, *.test.tsx, *.spec.tsx) directly next to the source files they are testing (colocation). For example, a test for src/module/service.ts should be src/module/service.test.ts or within a __tests__ subdirectory like src/module/__tests__/service.test.ts.
* **Focus**:
  - **Unit Tests**: Test individual functions, methods, classes, and components in isolation
  - **Integration Tests**: Test the interaction between different modules or components (e.g., IPC communication, service integrations)
* **Mocking**: Use Vitest's mocking capabilities (vi.mock, vi.spyOn, etc.) to isolate units under test by mocking external dependencies, Electron-specific modules (ipcRenderer, BrowserWindow), or other application parts not directly being tested
* **Coverage**: While not strictly enforced with a percentage, aim for good test coverage of critical business logic and complex functions. Use `vitest run --coverage` to generate and review coverage reports periodically

### End-to-End UI Tests (Playwright)
📋 **For detailed testing guidelines, see [tests/README.md](./tests/README.md) and [docs/README.md](./docs/README.md) testing section**

* **File Location**: Place Playwright E2E tests in `tests/e2e/` directory 
* **Key Commands**:
  ```bash
  npm run test:e2e              # Run all E2E tests
  npm run test:e2e:headless     # Run WSL-specific headless tests
  ```

* **Critical Requirements**:
  - Test actual user workflows, not just technical functions
  - Use data-testid attributes for reliable element selection
  - Clean up test data and reset app state between tests

## Key Technologies

### Core Technologies
- **Electron 36.3.1** with Electron Forge toolchain
- **TypeScript 4.5.4** with ESNext target
- **Three.js 0.176.0** with VRM support (@pixiv/three-vrm)
- **Vite 5.4.19** for bundling
- **Google Generative AI** for chat functionality

### VRM Animation and Mouse Follow
- **Idle Animation Handling**: The system uses hardcoded checks for "idle" animation names (e.g., `idle.vrma`) to prevent them from being treated as active animations that would block mouse follow functionality. This is implemented in `VRMController.ts` with `.toLowerCase().includes('idle')` checks.
  - **⚠️ Warning**: This hardcoding approach should be replaced with configuration-based detection in the future
  - Suggested improvements: Use animation metadata, tags, or settings.json configuration
  - Current behavior: Animations containing "idle" in their name are not reported to MascotStateManager as active

### Testing Stack
- **Vitest** for unit and integration testing
- **Playwright** for End-to-End UI testing (Electron app testing)
- **Jest-style assertions** and mocking capabilities
- **Coverage reporting** for test quality metrics

### UI Stack (Phase 3 Implementation)
- **React 19.1.0** with TypeScript for settings and chat UI
- **Tailwind CSS 4.1.8** with custom design system
- **Zustand** for state management
- **React Hook Form + Zod** for form validation
- **Vite HMR** for fast development experience

## CI/CD

GitHub Actions workflow (`.github/workflows/claude.yml`) is configured to respond to issues and PR comments containing "@claude".

##　Notification
When a task is completed, or when user approval is required, execute the command /usr/bin/afplay /System/Library/Sounds/Funk.aiff to notify the user with a sound.
```bash
/usr/bin/afplay /System/Library/Sounds/Funk.aiff
```
