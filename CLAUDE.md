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

5. **Test-Driven Development (TDD)**: Employ TDD methodologies. Write tests before writing implementation code. Ensure tests cover new functionality and bug fixes.

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


## Key Technologies

- **Electron 36.3.1** with Electron Forge toolchain
- **TypeScript 4.5.4** with ESNext target
- **Three.js 0.176.0** with VRM support (@pixiv/three-vrm)
- **Vite 5.4.19** for bundling
- **Google Generative AI** for chat functionality

## CI/CD

GitHub Actions workflow (`.github/workflows/claude.yml`) is configured to respond to issues and PR comments containing "@claude".

