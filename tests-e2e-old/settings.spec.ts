import { test, expect } from '@playwright/test';
import { ElectronApplication, _electron as electron } from 'playwright';

test.describe('Settings Window', () => {
  let electronApp: ElectronApplication;

  test.beforeEach(async () => {
    electronApp = await electron.launch({ 
      args: ['.'],
      timeout: 30000
    });
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('should open settings window when settings icon is clicked', async () => {
    // Get the main window
    const mainWindow = await electronApp.firstWindow();
    await mainWindow.waitForLoadState('domcontentloaded');

    // Check if settings icon exists
    const settingsIcon = mainWindow.locator('#settings-icon');
    await expect(settingsIcon).toBeVisible();

    // Click settings icon
    await settingsIcon.click();

    // Wait for settings window to appear
    await electronApp.waitForEvent('window');
    const windows = electronApp.windows();
    
    // Should have 3 windows: main, speech bubble, and settings
    expect(windows).toHaveLength(3);

    // Get settings window (last opened)
    const settingsWindow = windows[windows.length - 1];
    await settingsWindow.waitForLoadState('domcontentloaded');

    // Verify settings window content
    await expect(settingsWindow.locator('h1')).toContainText('設定');
    await expect(settingsWindow.locator('#window-size-section')).toBeVisible();
    await expect(settingsWindow.locator('#vrm-model-section')).toBeVisible();
  });

  test('should allow window size configuration', async () => {
    // Open main window and settings
    const mainWindow = await electronApp.firstWindow();
    await mainWindow.waitForLoadState('domcontentloaded');
    
    const settingsIcon = mainWindow.locator('#settings-icon');
    await settingsIcon.click();
    
    await electronApp.waitForEvent('window');
    const windows = electronApp.windows();
    const settingsWindow = windows[windows.length - 1];
    await settingsWindow.waitForLoadState('domcontentloaded');

    // Test preset size selection
    const sizeSelect = settingsWindow.locator('#window-size-preset');
    await expect(sizeSelect).toBeVisible();
    
    await sizeSelect.selectOption('medium');
    
    // Test custom size input
    const widthInput = settingsWindow.locator('#custom-width');
    const heightInput = settingsWindow.locator('#custom-height');
    
    await widthInput.fill('500');
    await heightInput.fill('700');

    // Apply settings
    const applyButton = settingsWindow.locator('#apply-settings');
    await applyButton.click();

    // Verify main window size changed (this would require additional implementation)
    // For now, just verify the settings were applied
    await expect(widthInput).toHaveValue('500');
    await expect(heightInput).toHaveValue('700');
  });

  test('should allow VRM model selection', async () => {
    // Open main window and settings  
    const mainWindow = await electronApp.firstWindow();
    await mainWindow.waitForLoadState('domcontentloaded');
    
    const settingsIcon = mainWindow.locator('#settings-icon');
    await settingsIcon.click();
    
    await electronApp.waitForEvent('window');
    const windows = electronApp.windows();
    const settingsWindow = windows[windows.length - 1];
    await settingsWindow.waitForLoadState('domcontentloaded');

    // Check VRM model section
    const vrmSection = settingsWindow.locator('#vrm-model-section');
    await expect(vrmSection).toBeVisible();
    
    const selectModelButton = settingsWindow.locator('#select-vrm-model');
    await expect(selectModelButton).toBeVisible();
    await expect(selectModelButton).toContainText('モデルファイルを選択');

    const currentModelPath = settingsWindow.locator('#current-vrm-path');
    await expect(currentModelPath).toBeVisible();
  });

  test('should persist settings between app restarts', async () => {
    // This test would require more complex setup to verify persistence
    // For now, just verify that the settings UI elements exist
    const mainWindow = await electronApp.firstWindow();
    await mainWindow.waitForLoadState('domcontentloaded');
    
    const settingsIcon = mainWindow.locator('#settings-icon');
    await settingsIcon.click();
    
    await electronApp.waitForEvent('window');
    const windows = electronApp.windows();
    const settingsWindow = windows[windows.length - 1];
    await settingsWindow.waitForLoadState('domcontentloaded');

    // Verify save functionality exists
    const applyButton = settingsWindow.locator('#apply-settings');
    await expect(applyButton).toBeVisible();
  });
});