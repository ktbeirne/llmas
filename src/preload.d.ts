declare global {
    interface Window {
        electronAPI: {
            sendPromptToGemini: (prompt: string) => Promise<string>; // chat.htmlで使っている関数
            onDisplaySpeechBubble: (callback: (text: string) => void) => void; // characterWindowのrenderer.tsで使っている関数
            // もし他にもpreload.tsで公開した関数があれば、ここに追加します
        };
    }
}

// このファイルがモジュールとして扱われるように、空のexportを追加することが推奨される場合があります。
// (他のファイルで import/export を使っている場合、このファイルもモジュールにするため)
// しかし、グローバル拡張の場合はこれだけでも機能することが多いです。
// もしVSCodeが「Augmentations for the global scope can only be directly nested in external modules or ambient module declarations.」
// のようなエラーをこのファイルで出す場合は、ファイルの最後に export {}; を追加してみてください。
export { }; // Add this if your tsconfig.json treats .d.ts files as modules or you get global augmentation errors