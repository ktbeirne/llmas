/**
 * 統一されたElectronモック
 * 
 * 各テストで一貫したElectronAPIのモックを提供します。
 * 必要に応じて個別のテストでカスタマイズ可能です。
 */

import { vi } from 'vitest';

// Mock BrowserWindow
export const mockBrowserWindow = {
  isDestroyed: vi.fn().mockReturnValue(false),
  getBounds: vi.fn().mockReturnValue({ x: 100, y: 100, width: 800, height: 600 }),
  setBounds: vi.fn(),
  getTitle: vi.fn().mockReturnValue('Mock Window'),
  show: vi.fn(),
  hide: vi.fn(),
  close: vi.fn(),
  focus: vi.fn(),
  isVisible: vi.fn().mockReturnValue(true),
  isMinimized: vi.fn().mockReturnValue(false),
  isMaximized: vi.fn().mockReturnValue(false),
  minimize: vi.fn(),
  maximize: vi.fn(),
  unmaximize: vi.fn(),
  restore: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  isAlwaysOnTop: vi.fn().mockReturnValue(false),
  center: vi.fn(),
  setPosition: vi.fn(),
  getPosition: vi.fn().mockReturnValue([100, 100]),
  setSize: vi.fn(),
  getSize: vi.fn().mockReturnValue([800, 600]),
  setContentSize: vi.fn(),
  getContentSize: vi.fn().mockReturnValue([800, 600]),
  setMinimumSize: vi.fn(),
  getMinimumSize: vi.fn().mockReturnValue([300, 200]),
  setMaximumSize: vi.fn(),
  getMaximumSize: vi.fn().mockReturnValue([1920, 1080]),
  setResizable: vi.fn(),
  isResizable: vi.fn().mockReturnValue(true),
  setMovable: vi.fn(),
  isMovable: vi.fn().mockReturnValue(true),
  setMinimizable: vi.fn(),
  isMinimizable: vi.fn().mockReturnValue(true),
  setMaximizable: vi.fn(),
  isMaximizable: vi.fn().mockReturnValue(true),
  setFullScreenable: vi.fn(),
  isFullScreenable: vi.fn().mockReturnValue(true),
  setClosable: vi.fn(),
  isClosable: vi.fn().mockReturnValue(true),
  setTitle: vi.fn(),
  loadFile: vi.fn().mockResolvedValue(undefined),
  loadURL: vi.fn().mockResolvedValue(undefined),
  reload: vi.fn(),
  id: 1,
  webContents: {
    executeJavaScript: vi.fn().mockResolvedValue({}),
    send: vi.fn(),
    once: vi.fn(),
    on: vi.fn(),
    removeAllListeners: vi.fn(),
    isDevToolsOpened: vi.fn().mockReturnValue(false),
    openDevTools: vi.fn(),
    closeDevTools: vi.fn(),
    toggleDevTools: vi.fn(),
    getUserAgent: vi.fn().mockReturnValue('Mock User Agent'),
    insertCSS: vi.fn().mockResolvedValue(''),
    removeInsertedCSS: vi.fn().mockResolvedValue(undefined),
    setZoomFactor: vi.fn(),
    getZoomFactor: vi.fn().mockReturnValue(1.0),
    setZoomLevel: vi.fn(),
    getZoomLevel: vi.fn().mockReturnValue(0),
    canGoBack: vi.fn().mockReturnValue(false),
    canGoForward: vi.fn().mockReturnValue(false),
    goBack: vi.fn(),
    goForward: vi.fn(),
    stop: vi.fn(),
    print: vi.fn(),
    printToPDF: vi.fn().mockResolvedValue(Buffer.alloc(0)),
    capturePage: vi.fn().mockResolvedValue({} as any),
    isFocused: vi.fn().mockReturnValue(true),
    focus: vi.fn(),
    blur: vi.fn(),
    cut: vi.fn(),
    copy: vi.fn(),
    paste: vi.fn(),
    selectAll: vi.fn(),
    unselect: vi.fn(),
    undo: vi.fn(),
    redo: vi.fn(),
    delete: vi.fn(),
    replace: vi.fn(),
    findInPage: vi.fn().mockReturnValue({ requestId: 1 }),
    stopFindInPage: vi.fn(),
    session: {
      clearCache: vi.fn().mockResolvedValue(undefined),
      clearStorageData: vi.fn().mockResolvedValue(undefined)
    }
  },
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn()
};

// Mock IPC Main
export const mockIpcMain = {
  handle: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeHandler: vi.fn(),
  removeAllListeners: vi.fn()
};

// Mock IPC Renderer  
export const mockIpcRenderer = {
  invoke: vi.fn().mockResolvedValue({}),
  send: vi.fn(),
  sendSync: vi.fn().mockReturnValue({}),
  on: vi.fn(),
  once: vi.fn(),
  removeListener: vi.fn(),
  removeAllListeners: vi.fn()
};

// Mock App
export const mockApp = {
  quit: vi.fn(),
  exit: vi.fn(),
  relaunch: vi.fn(),
  isReady: vi.fn().mockReturnValue(true),
  whenReady: vi.fn().mockResolvedValue(undefined),
  focus: vi.fn(),
  hide: vi.fn(),
  show: vi.fn(),
  getAppPath: vi.fn().mockReturnValue('/mock/app/path'),
  getPath: vi.fn().mockImplementation((name: string) => `/mock/path/${name}`),
  getName: vi.fn().mockReturnValue('LLMDesktopMascot'),
  setName: vi.fn(),
  getVersion: vi.fn().mockReturnValue('1.0.0'),
  getLocale: vi.fn().mockReturnValue('ja-JP'),
  getLocaleCountryCode: vi.fn().mockReturnValue('JP'),
  addRecentDocument: vi.fn(),
  clearRecentDocuments: vi.fn(),
  setAsDefaultProtocolClient: vi.fn().mockReturnValue(true),
  removeAsDefaultProtocolClient: vi.fn().mockReturnValue(true),
  isDefaultProtocolClient: vi.fn().mockReturnValue(false),
  setUserTasks: vi.fn().mockReturnValue(true),
  getJumpListSettings: vi.fn().mockReturnValue({ removedItems: [] }),
  setJumpList: vi.fn().mockReturnValue('ok'),
  dock: {
    bounce: vi.fn().mockReturnValue(1),
    cancelBounce: vi.fn(),
    downloadFinished: vi.fn(),
    setBadge: vi.fn(),
    getBadge: vi.fn().mockReturnValue(''),
    hide: vi.fn(),
    show: vi.fn(),
    isVisible: vi.fn().mockReturnValue(true),
    setMenu: vi.fn(),
    getMenu: vi.fn().mockReturnValue(null),
    setIcon: vi.fn()
  },
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn()
};

// Mock Dialog
export const mockDialog = {
  showOpenDialog: vi.fn().mockResolvedValue({ 
    canceled: false, 
    filePaths: ['/mock/path/to/file.vrm'] 
  }),
  showSaveDialog: vi.fn().mockResolvedValue({ 
    canceled: false, 
    filePath: '/mock/path/to/save/file.txt' 
  }),
  showMessageBox: vi.fn().mockResolvedValue({ 
    response: 0, 
    checkboxChecked: false 
  }),
  showErrorBox: vi.fn(),
  showCertificateTrustDialog: vi.fn().mockResolvedValue(undefined)
};

// Mock Shell
export const mockShell = {
  showItemInFolder: vi.fn(),
  openPath: vi.fn().mockResolvedValue(''),
  openExternal: vi.fn().mockResolvedValue(undefined),
  moveItemToTrash: vi.fn().mockReturnValue(true),
  beep: vi.fn(),
  writeShortcutLink: vi.fn().mockReturnValue(true),
  readShortcutLink: vi.fn().mockReturnValue({})
};

// Mock Screen
export const mockScreen = {
  getPrimaryDisplay: vi.fn().mockReturnValue({
    bounds: { x: 0, y: 0, width: 1920, height: 1080 },
    workArea: { x: 0, y: 0, width: 1920, height: 1040 },
    size: { width: 1920, height: 1080 },
    workAreaSize: { width: 1920, height: 1040 },
    scaleFactor: 1.0,
    rotation: 0,
    colorSpace: 'srgb',
    colorDepth: 24
  }),
  getAllDisplays: vi.fn().mockReturnValue([]),
  getDisplayNearestPoint: vi.fn().mockReturnValue({}),
  getDisplayMatching: vi.fn().mockReturnValue({}),
  getCursorScreenPoint: vi.fn().mockReturnValue({ x: 100, y: 100 }),
  on: vi.fn(),
  removeAllListeners: vi.fn()
};

// Mock Notification
export const mockNotification = vi.fn().mockImplementation(() => ({
  show: vi.fn(),
  close: vi.fn(),
  on: vi.fn(),
  once: vi.fn(),
  removeAllListeners: vi.fn()
}));

// メインのElectronモック
export const electronMock = {
  BrowserWindow: vi.fn().mockImplementation(() => mockBrowserWindow),
  ipcMain: mockIpcMain,
  ipcRenderer: mockIpcRenderer,
  app: mockApp,
  dialog: mockDialog,
  shell: mockShell,
  screen: mockScreen,
  Notification: mockNotification
};

// BrowserWindow関連のヘルパー
electronMock.BrowserWindow.getAllWindows = vi.fn().mockReturnValue([mockBrowserWindow]);
electronMock.BrowserWindow.getFocusedWindow = vi.fn().mockReturnValue(mockBrowserWindow);
electronMock.BrowserWindow.fromId = vi.fn().mockReturnValue(mockBrowserWindow);

/**
 * Electronモックをリセットする関数
 * 各テストのbeforeEachで呼び出すことを推奨
 */
export const resetElectronMocks = (): void => {
  vi.clearAllMocks();
  
  // デフォルト値をリセット
  mockBrowserWindow.isDestroyed.mockReturnValue(false);
  mockBrowserWindow.getBounds.mockReturnValue({ x: 100, y: 100, width: 800, height: 600 });
  mockBrowserWindow.getTitle.mockReturnValue('Mock Window');
  mockBrowserWindow.isVisible.mockReturnValue(true);
  mockBrowserWindow.isMinimized.mockReturnValue(false);
  mockBrowserWindow.isMaximized.mockReturnValue(false);
  mockBrowserWindow.isAlwaysOnTop.mockReturnValue(false);
  
  mockApp.isReady.mockReturnValue(true);
  mockApp.whenReady.mockResolvedValue(undefined);
  mockApp.getAppPath.mockReturnValue('/mock/app/path');
  mockApp.getName.mockReturnValue('LLMDesktopMascot');
  mockApp.getVersion.mockReturnValue('1.0.0');
  
  mockDialog.showOpenDialog.mockResolvedValue({ 
    canceled: false, 
    filePaths: ['/mock/path/to/file.vrm'] 
  });
  mockDialog.showSaveDialog.mockResolvedValue({ 
    canceled: false, 
    filePath: '/mock/path/to/save/file.txt' 
  });
  mockDialog.showMessageBox.mockResolvedValue({ 
    response: 0, 
    checkboxChecked: false 
  });
  
  electronMock.BrowserWindow.getAllWindows.mockReturnValue([mockBrowserWindow]);
  electronMock.BrowserWindow.getFocusedWindow.mockReturnValue(mockBrowserWindow);
  electronMock.BrowserWindow.fromId.mockReturnValue(mockBrowserWindow);
};

export default electronMock;