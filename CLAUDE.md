# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application that creates an interactive AI-powered desktop mascot. The mascot is rendered as a 3D VRM model and can interact with users through chat and speech bubbles.

## Architecture

### High-Level Overview
The application follows **Clean Architecture** principles with clear separation of concerns and dependency inversion. For detailed architectural information, please refer to [ARCHITECTURE.md](./ARCHITECTURE.md).

### Core Architectural Principles
- **Clean Architecture**: Dependency inversion with domain-centric design
- **Single Responsibility**: Each component has a single, well-defined purpose
- **Dependency Injection**: Flexible configuration through DIContainer
- **Test-Driven Design**: Comprehensive testing strategy at all layers

### Layer Structure
```
Presentation (main.ts, IPC) → Application (ApplicationService) 
→ Domain (Entities, Services) ← Infrastructure (Gateways, Repositories)
```

### Multi-Window Electron Architecture
- **Main Window**: Displays the 3D VRM mascot using Three.js
- **Chat Window**: Text-based chat interface
- **Speech Bubble Window**: Floating speech bubble for mascot responses

### Key Components (Legacy - being refactored)
- `src/main.ts`: Electron main process (reduced from 1,404 to 363 lines)
- `src/application/ApplicationService.ts`: Main application orchestrator
- `src/domain/`: Pure business logic and entities
- `src/infrastructure/`: External service integrations
- `src/renderer.ts`: Main window renderer for 3D mascot display
- `src/vrmController.ts`: VRM model loading and animation control

## Common Commands

### Development
```bash
npm start                 # Start the application in development mode
npm run lint             # Run ESLint on TypeScript files
```

### Building and Packaging
```bash
npm run package          # Package the app without creating distributables
npm run make             # Create platform-specific installers
npm run publish          # Publish the app
```

## Development Requirements

1. **Environment Variables**: The app uses Google Gemini AI. Ensure proper API keys are configured through dotenv.

2. **VRM Models**: The application expects VRM model files for the mascot. These should be placed in the appropriate directory and referenced in the code.

3. **Window Configuration**: The app uses transparent, frameless windows. Be careful when modifying window settings in `forge.config.ts` and the main process.

4. **User Interaction Language**: All interactions with the user (e.g., comments in code, pull request descriptions, chat responses if applicable) must be in Japanese.

5. **🚨 MANDATORY: Test-Driven Development (TDD)** ⚠️ **NON-NEGOTIABLE** ⚠️: Employ TDD methodologies. Write tests BEFORE writing implementation code. Ensure tests cover new functionality and bug fixes. **ANY IMPLEMENTATION WITHOUT PRIOR TESTS WILL BE REJECTED**. (Refer to "Testing Guidelines" for detailed enforcement rules).

6. **Planning Before Implementation**: Always create a clear plan before starting any coding task. This plan should outline the steps to be taken, an estimate of affected files, and any potential challenges or edge cases.

7. **Referring to Backlog items**: Our Kanban board is located at `/mnt/d/AI/Mascot/LLMDesktopMascot/.Obsidian/llmascot/Backlog/Kanban.md` and these backlog items are located at `/mnt/d/AI/Mascot/LLMDesktopMascot/.Obsidian/llmascot/Backlog/PBI/*.md` .Whenever a user asks you to implement a PBI, you must refer to these to understand the user story.

8. After receiving tool results, carefully reflect on their quality and determine optimal next steps before proceeding. Use your thinking to plan and iterate based on this new information, and then take the best next action.

9. For maximum efficiency, whenever you need to perform multiple independent operations, invoke all relevant tools simultaneously rather than sequentially.

10. **Don't hold back. Give it your all.**

## Architecture Guidelines

**IMPORTANT**: This application follows Clean Architecture principles. When adding new features or modifying existing code:

1. **Respect Layer Boundaries**: Never allow inner layers (Domain) to depend on outer layers (Infrastructure)
2. **Use Dependency Injection**: Register all dependencies through DIContainer
3. **Domain-First Design**: Business logic belongs in Domain layer (entities, services)
4. **Interface Segregation**: Define contracts in Domain, implement in Infrastructure
5. **Test Strategy**: Write tests for each layer independently with proper mocking
6. **Migration Approach**: Use Adapter pattern when integrating with legacy code

**Key Files to Understand**:
- `ARCHITECTURE.md`: Complete architectural documentation
- `src/application/ApplicationService.ts`: Main application orchestrator
- `src/infrastructure/DIContainer.ts`: Dependency injection configuration
- `src/domain/`: Business logic and core entities

**Before implementing new features**:
1. Read the relevant sections in ARCHITECTURE.md
2. Understand which layer the changes belong to
3. Design interfaces before implementations
4. Consider testability and maintainability
5. Follow the established patterns and conventions

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
* **File Location**: Place Playwright E2E tests in `tests-e2e/` directory (e.g., `tests-e2e/chat-flow.spec.ts`, `tests-e2e/settings-window.spec.ts`)
* **Test Structure**: Follow the existing pattern in `tests-e2e/` for consistency:
  ```typescript
  import { test, expect } from '@playwright/test';
  import { ElectronApplication } from '@playwright/test';
  
  test.describe('Feature Name', () => {
    let electronApp: ElectronApplication;
    
    test.beforeAll(async ({ playwright }) => {
      electronApp = await playwright.electron.launch({ args: ['.'] });
    });
    
    test.afterAll(async () => {
      await electronApp.close();
    });
    
    test('should perform user interaction', async () => {
      // Test implementation
    });
  });
  ```

* **Focus Areas**:
  - **Window Management**: Multi-window interactions, window state persistence
  - **Chat Flow**: Complete chat interaction cycles including AI responses
  - **Settings UI**: Settings window functionality and persistence
  - **VRM Integration**: 3D model loading and expression changes
  - **IPC Communication**: Cross-window messaging and data flow
  
* **Test Requirements**:
  - **Real User Scenarios**: Test actual user workflows, not just technical functions
  - **Cross-Window Testing**: Verify interactions between main, chat, and settings windows
  - **State Persistence**: Confirm settings and window positions are saved/restored
  - **Error Handling**: Test error scenarios and recovery paths
  - **Performance**: Verify app startup time and responsiveness

* **Playwright Commands**:
  ```bash
  npm run test:e2e              # Run all E2E tests
  npm run test:e2e:headed       # Run with visible browser
  npm run test:e2e:debug        # Run in debug mode
  ```

* **Best Practices**:
  - Use data-testid attributes for reliable element selection
  - Wait for specific conditions rather than arbitrary timeouts
  - Clean up test data and reset app state between tests
  - Use Page Object Model for complex UI interactions
  - Capture screenshots on test failures for debugging

## Key Technologies

### Core Technologies
- **Electron 36.3.1** with Electron Forge toolchain
- **TypeScript 4.5.4** with ESNext target
- **Three.js 0.176.0** with VRM support (@pixiv/three-vrm)
- **Vite 5.4.19** for bundling
- **Google Generative AI** for chat functionality

### Testing Stack
- **Vitest** for unit and integration testing
- **Playwright** for End-to-End UI testing (Electron app testing)
- **Jest-style assertions** and mocking capabilities
- **Coverage reporting** for test quality metrics

## CI/CD

GitHub Actions workflow (`.github/workflows/claude.yml`) is configured to respond to issues and PR comments containing "@claude".

