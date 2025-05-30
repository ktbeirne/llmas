# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an Electron desktop application that creates an interactive AI-powered desktop mascot. The mascot is rendered as a 3D VRM model and can interact with users through chat and speech bubbles.

## Architecture

The application uses a multi-window Electron architecture:
- **Main Window**: Displays the 3D VRM mascot using Three.js
- **Chat Window**: Text-based chat interface
- **Speech Bubble Window**: Floating speech bubble for mascot responses

Key components:
- `src/main.ts`: Electron main process handling window management and IPC
- `src/renderer.ts`: Main window renderer for 3D mascot display
- `src/vrmController.ts`: VRM model loading and animation control
- `src/geminiService.ts`: Google Gemini AI integration
- `renderer/speech_bubble/`: Speech bubble window implementation

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

5. **Test-Driven Development (TDD)**: Employ TDD methodologies. Write tests before writing implementation code. Ensure tests cover new functionality and bug fixes. (Refer to "Testing Guidelines" for more details).

6. **Planning Before Implementation**: Always create a clear plan before starting any coding task. This plan should outline the steps to be taken, an estimate of affected files, and any potential challenges or edge cases.

7. **Pull Request Submission**: Submit a pull request once all planned tasks are completed.
   
## UI/UX Design Guidelines
1. **Color Palette Adherence**: All UI design elements should be adhere to the color palette defined below. Ensure consistency in color usage across all windows and components.

#BFECFF // Primary Color (e.g., for main actions, highlights)
#CDC1FF // Secondary Color (e.g., for less prominent elements, accents)
#FFF6E3 // Background Color (e.g., for main window background)
#FFCCEA // Accent Color

2. **Text Legibility and Contrast**: Ensure all text maintains sufficient color contrast against its background to meet accessibility standards (e.g., WCAG AA level for normal text, and AAA for large text where possible). This is crucial for readability and inclusivity. Regularly check contrast ratios using appropriate tools.

3. **Enhanced Desktop Presence**: The UI design should aim to create a strong sense of presence for the desktop mascot, making **it feel as if it's truly part of the desktop environment**. Employ creative UI solutions, such as transparency, borderless windows, or an unobtrusive interface where appropriate, to enhance this effect and avoid obscuring the user's regular desktop activities.

4. **Refined User Experience (UX)**: Strive for a polished, intuitive, and sophisticated UI design. All design choices should aim to enhance the overall user experience, making interactions intuitive and enjoyable. Consider aspects like visual hierarchy, readability, and ease of use.

## Testing Guidelines
### General Principles
* Strictly follow Test-Driven Development (TDD) methodologies as outlined in "Development Requirements."
* Utilize a combination of unit, integration, and end-to-end (E2E) tests to ensure comprehensive application coverage.
* All new features, enhancements, and bug fixes must be accompanied by relevant tests.
* Write tests that are clear, concise, maintainable, and run reliably, especially in CI/CD environments.
* Test descriptions (e.g., it('should do X when Y')) and any significant comments within test files should be written in English for consistency and broader understanding.

### Unit & Integration Tests (Vitest)
* File Location: Place Vitest test files (e.g., *.test.ts, *.spec.ts, *.test.tsx, *.spec.tsx) directly next to the source files they are testing (colocation). For example, a test for src/module/service.ts should be src/module/service.test.ts or within a __tests__ subdirectory like src/module/__tests__/service.test.ts.
* Focus:
  - Unit Tests: Test individual functions, methods, classes, and components in isolation.
  - Integration Tests: Test the interaction between different modules or components (e.g., IPC communication lógica, service integrations).
* Mocking: Use Vitest's mocking capabilities (vi.mock, vi.spyOn, etc.) to isolate units under test by mocking external dependencies, Electron-specific modules (ipcRenderer, BrowserWindow), or other application parts not directly being tested.
* Coverage: While not strictly enforced with a percentage, aim for good test coverage of critical business logic and complex functions. Use vitest run --coverage to generate and review coverage reports periodically.

### End-to-End Tests (Playwright)
* File Location: Store all Playwright E2E test files (e.g., *.spec.ts) in the tests-e2e/ directory at the project root.
* Focus: Test critical user flows, major application features, and UI interactions from an end-user's perspective, simulating real user behavior. This includes:
  - Application startup and window visibility.
  - Core functionalities like mascot interactions, chat features, and responses.
  - UI element states and transitions.
* Test Design: Write robust and reliable E2E tests. Avoid overly brittle tests температура (tests that break easily with minor UI changes). Consider using the Page Object Model (POM) design pattern for better organization and maintainability if the E2E test suite grows.
* Target Browser: The primary target browser for E2E testing is Chromium. Please configure Playwright (in playwright.config.ts) to run tests primarily, or exclusively, on Chromium to ensure compatibility and focus testing efforts. While Playwright supports other browsers, Chromium is the current priority for this project.

## Key Technologies

- **Electron 36.3.1** with Electron Forge toolchain
- **TypeScript 4.5.4** with ESNext target
- **Three.js 0.176.0** with VRM support (@pixiv/three-vrm)
- **Vite 5.4.19** for bundling
- **Google Generative AI** for chat functionality

## CI/CD

GitHub Actions workflow (`.github/workflows/claude.yml`) is configured to respond to issues and PR comments containing "@claude".

