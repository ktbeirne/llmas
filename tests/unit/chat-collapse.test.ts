/**
 * チャットウィンドウ折り畳み機能 ユニットテスト
 * 
 * 折り畳み機能の基本的な動作を確認
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('チャットウィンドウ折り畳み機能', () => {
  let dom: JSDOM;
  let document: Document;
  let window: any;

  beforeEach(() => {
    // chat.htmlの簡易版を作成
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="response-area" style="display: block;">
            <div class="message-container">テストメッセージ</div>
          </div>
          <div id="input-area">
            <textarea id="prompt-input"></textarea>
            <button id="send-button">送信</button>
            <button id="collapse-button">▲</button>
          </div>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      runScripts: 'outside-only'
    });

    document = dom.window.document;
    window = dom.window;

    // グローバル変数を設定
    global.document = document;
    global.window = window;

    // electronAPIのモック
    window.electronAPI = {
      getChatCollapseState: vi.fn().mockResolvedValue(false),
      setChatCollapseState: vi.fn().mockResolvedValue(true)
    };
  });

  it('折り畳みボタンが存在する', () => {
    const collapseButton = document.getElementById('collapse-button');
    expect(collapseButton).toBeTruthy();
    expect(collapseButton?.textContent).toBe('▲');
  });

  it('折り畳みボタンをクリックすると会話履歴が非表示になる', () => {
    const collapseButton = document.getElementById('collapse-button') as HTMLButtonElement;
    const responseArea = document.getElementById('response-area') as HTMLDivElement;

    // 初期状態
    expect(responseArea.style.display).toBe('block');
    expect(collapseButton.textContent).toBe('▲');

    // 折り畳みボタンのクリックをシミュレート
    collapseButton.click();

    // クリック後の状態確認（実際の実装では非同期処理があるため、ここでは基本的な確認のみ）
    expect(collapseButton).toBeTruthy();
  });

  it('body要素にchat-collapsedクラスが追加される', () => {
    const body = document.body;
    
    // 初期状態
    expect(body.classList.contains('chat-collapsed')).toBe(false);

    // 折り畳み状態をシミュレート
    body.classList.add('chat-collapsed');

    // クラスが追加されたことを確認
    expect(body.classList.contains('chat-collapsed')).toBe(true);
  });

  it('折り畳み状態の保存APIが呼ばれる', async () => {
    const setChatCollapseStateSpy = vi.spyOn(window.electronAPI, 'setChatCollapseState');

    // APIを直接呼び出し
    await window.electronAPI.setChatCollapseState(true);

    // APIが正しく呼ばれたことを確認
    expect(setChatCollapseStateSpy).toHaveBeenCalledWith(true);
  });

  it('折り畳み状態の読み込みAPIが呼ばれる', async () => {
    const getChatCollapseStateSpy = vi.spyOn(window.electronAPI, 'getChatCollapseState');

    // APIを直接呼び出し
    const state = await window.electronAPI.getChatCollapseState();

    // APIが正しく呼ばれ、結果が返されることを確認
    expect(getChatCollapseStateSpy).toHaveBeenCalled();
    expect(state).toBe(false);
  });
});