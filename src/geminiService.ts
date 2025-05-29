import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold, GenerativeModel } from '@google/generative-ai'; // GenerativeModel型もインポート

let genAI: GoogleGenerativeAI | null = null;
let model: GenerativeModel | null = null; // 型をGenerativeModelに

// Geminiサービスを初期化する関数 (APIキーを引数で受け取る)
export function initializeGemini(apiKey: string) {
    if (!apiKey) {
        console.error('エラー: initializeGemini にAPIキーが渡されませんでした。');
        // ここでエラーを投げるか、初期化失敗状態を示すべき
        // throw new Error('APIキーがinitializeGeminiに渡されませんでした。');
        return; // とりあえず早期リターン
    }
    try {
        genAI = new GoogleGenerativeAI(apiKey);
        model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash-preview-05-20', // ご主人様ご希望のモデル
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
        });
        console.log('Gemini Service が正常に初期化されました。');
    } catch (error) {
        console.error('Gemini Service の初期化中にエラーが発生しました:', error);
        // ここでもエラーを投げるか、状態を管理する
    }
}

// Geminiにテキスト生成をリクエストする関数
export async function generateTextFromGemini(prompt: string): Promise<string> {
    if (!model) { // modelが初期化されているか確認
        console.error('エラー: Gemini Service が初期化されていません。initializeGeminiを先に呼び出してください。');
        return 'エラー: Gemini Service が初期化されていません。';
    }

    try {
        console.log(`Geminiへ送信するプロンプト: "${prompt}"`);
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        console.log('Geminiからの返答:', text);
        return text;
    } catch (error) {
        console.error('Gemini APIの呼び出し中にエラーが発生しました:', error);
        if (error instanceof Error) {
            return `テキスト生成エラー: ${error.message}`;
        }
        return 'Gemini APIの呼び出し中に不明なエラーが発生しました。';
    }
}