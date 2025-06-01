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
    
    // Window interface extensions
    interface Window {
        themeManager?: any;
    }
}

export {};