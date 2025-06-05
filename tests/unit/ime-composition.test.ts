/**
 * IME Composition Test
 * Tests for proper handling of Input Method Editor (IME) composition events
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('IME Composition Handling', () => {
  let dom: JSDOM;
  let document: Document;
  let promptInput: HTMLTextAreaElement;
  let sendButton: HTMLButtonElement;
  let isComposing: boolean;
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup DOM
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <textarea id="prompt-input"></textarea>
          <button id="send-button">送信</button>
        </body>
      </html>
    `);
    document = dom.window.document;
    promptInput = document.getElementById('prompt-input') as HTMLTextAreaElement;
    sendButton = document.getElementById('send-button') as HTMLButtonElement;
    
    // Setup mocks
    sendMessageMock = vi.fn();
    isComposing = false;

    // Add event listeners (simulating the actual implementation)
    promptInput.addEventListener('compositionstart', () => {
      isComposing = true;
    });

    promptInput.addEventListener('compositionend', () => {
      isComposing = false;
    });

    promptInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        // Check both local isComposing flag and event.isComposing
        if (isComposing || (event as any).isComposing) {
          return; // Don't send during IME composition
        }
        
        if (!event.shiftKey && !sendButton.disabled) {
          event.preventDefault();
          sendMessageMock();
        }
      }
    });
  });

  it('should not send message when Enter is pressed during IME composition', () => {
    // Set some text
    promptInput.value = 'こんにちは';
    
    // Fire compositionstart event (user starts IME conversion)
    const compositionStartEvent = new dom.window.Event('compositionstart');
    promptInput.dispatchEvent(compositionStartEvent);
    
    // Press Enter during composition
    const keydownEvent = new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: false
    });
    promptInput.dispatchEvent(keydownEvent);
    
    // Verify sendMessage was NOT called
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('should send message when Enter is pressed after IME composition ends', () => {
    // Set some text
    promptInput.value = 'こんにちは';
    
    // Fire compositionstart event
    const compositionStartEvent = new dom.window.Event('compositionstart');
    promptInput.dispatchEvent(compositionStartEvent);
    
    // Fire compositionend event (user completes IME conversion)
    const compositionEndEvent = new dom.window.Event('compositionend');
    promptInput.dispatchEvent(compositionEndEvent);
    
    // Press Enter after composition
    const keydownEvent = new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: false
    });
    promptInput.dispatchEvent(keydownEvent);
    
    // Verify sendMessage WAS called
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
  });

  it('should respect event.isComposing property when available', () => {
    // Set some text
    promptInput.value = 'テスト';
    
    // Press Enter with isComposing flag on event
    const keydownEvent = new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: false
    });
    Object.defineProperty(keydownEvent, 'isComposing', {
      value: true,
      writable: false
    });
    promptInput.dispatchEvent(keydownEvent);
    
    // Verify sendMessage was NOT called
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('should allow Enter+Shift for line breaks during composition', () => {
    // Set some text
    promptInput.value = 'メッセージ';
    
    // Fire compositionstart event
    const compositionStartEvent = new dom.window.Event('compositionstart');
    promptInput.dispatchEvent(compositionStartEvent);
    
    // Press Enter+Shift during composition
    const keydownEvent = new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: true
    });
    promptInput.dispatchEvent(keydownEvent);
    
    // Verify sendMessage was NOT called (Shift+Enter creates new line)
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('should not send when send button is disabled', () => {
    // Disable send button
    sendButton.disabled = true;
    promptInput.value = 'テスト';
    
    // Press Enter
    const keydownEvent = new dom.window.KeyboardEvent('keydown', {
      key: 'Enter',
      shiftKey: false
    });
    promptInput.dispatchEvent(keydownEvent);
    
    // Verify sendMessage was NOT called
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});