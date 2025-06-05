// ElectronStore type extension
declare module 'electron-store' {
    export default class ElectronStore<T = any> {
        constructor(options?: any);
        get(key: string, defaultValue?: any): any;
        set(key: string, value: any): void;
        has(key: string): boolean;
        delete(key: string): void;
        clear(): void;
        readonly path: string;
        readonly store: T;
    }
}

// WebKit specific CSS properties
declare global {
    interface CSSStyleDeclaration {
        webkitAppRegion?: string;
    }
    
    // VRM types
    interface VRMController {
        getCurrentVRM(): import('@pixiv/three-vrm').VRM | null;
    }
    
    // Window interface extensions
    interface Window {
        themeManager?: any;
        vrmController?: VRMController;
    }
}

export {};