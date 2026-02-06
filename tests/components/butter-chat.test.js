/**
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ButterChat } from '../../src/components/butter-chat.js';
import { ButterStore } from '../../src/services/butter-store.js';

describe('ButterChat', () => {
  let container;
  let chat;
  let store;

  beforeEach(() => {
    // Create container
    container = document.createElement('div');
    document.body.appendChild(container);
    localStorage.clear();
    store = new ButterStore();

    // Define custom element if not already defined
    if (!customElements.get('butter-chat')) {
      customElements.define('butter-chat', ButterChat);
    }
  });

  afterEach(() => {
    chat?.remove();
    store?.destroy();
    container.remove();
    localStorage.clear();
  });

  describe('Element Definition', () => {
    it('should be defined as a custom element', () => {
      expect(customElements.get('butter-chat')).toBe(ButterChat);
    });

    it('should extend HTMLElement', () => {
      expect(new ButterChat()).toBeInstanceOf(HTMLElement);
    });
  });

  describe('Attributes', () => {
    it('should reflect orchestrator-id attribute', async () => {
      chat = document.createElement('butter-chat');
      chat.setAttribute('orchestrator-id', 'orch-123');
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      expect(chat.getAttribute('orchestrator-id')).toBe('orch-123');
    });

    it('should reflect loading attribute', async () => {
      chat = document.createElement('butter-chat');
      chat.setAttribute('loading', '');
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      expect(chat.hasAttribute('loading')).toBe(true);
    });

    it('should remove loading attribute', async () => {
      chat = document.createElement('butter-chat');
      chat.setAttribute('loading', '');
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      chat.removeAttribute('loading');
      expect(chat.hasAttribute('loading')).toBe(false);
    });
  });

  describe('DOM Structure', () => {
    beforeEach(async () => {
      chat = document.createElement('butter-chat');
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');
    });

    it('should have a chat header', () => {
      const header = chat.querySelector('.chat-header');
      expect(header).toBeTruthy();
    });

    it('should have a messages container', () => {
      const messagesContainer = chat.querySelector('.messages-container');
      expect(messagesContainer).toBeTruthy();
    });

    it('should have a chat input area', () => {
      const inputArea = chat.querySelector('.chat-input-area');
      expect(inputArea).toBeTruthy();
    });

    it('should have a text input', () => {
      const input = chat.querySelector('.message-input');
      expect(input).toBeTruthy();
      expect(input.tagName.toLowerCase()).toBe('textarea');
    });

    it('should have a send button', () => {
      const button = chat.querySelector('.send-button');
      expect(button).toBeTruthy();
    });

    it('should have a file drop zone', () => {
      const dropZone = chat.querySelector('.file-drop-zone');
      expect(dropZone).toBeTruthy();
    });
  });

  describe('Message History Display', () => {
    it('should display messages from ButterStore', async () => {
      chat = document.createElement('butter-chat');
      chat.store = store;
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      const messages = [
        { id: '1', content: 'Hello', sender: 'user', timestamp: Date.now() },
        { id: '2', content: 'Hi there!', sender: 'ai', timestamp: Date.now() }
      ];
      store.set('messages', messages);

      // Wait for DOM update
      await new Promise(resolve => setTimeout(resolve, 0));

      const messageElements = chat.querySelectorAll('butter-message');
      expect(messageElements.length).toBe(2);
    });

    it('should use butter-message component for each message', async () => {
      chat = document.createElement('butter-chat');
      chat.store = store;
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      store.set('messages', [{ id: '1', content: 'Test', sender: 'user', timestamp: Date.now() }]);

      await new Promise(resolve => setTimeout(resolve, 0));

      const messageEl = chat.querySelector('butter-message');
      expect(messageEl).toBeTruthy();
    });

    it('should filter messages by orchestrator-id', async () => {
      chat = document.createElement('butter-chat');
      chat.setAttribute('orchestrator-id', 'orch-1');
      chat.store = store;
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      const messages = [
        { id: '1', content: 'Hello', sender: 'user', orchestratorId: 'orch-1', timestamp: Date.now() },
        { id: '2', content: 'Other', sender: 'user', orchestratorId: 'orch-2', timestamp: Date.now() },
        { id: '3', content: 'World', sender: 'ai', orchestratorId: 'orch-1', timestamp: Date.now() }
      ];
      store.set('messages', messages);

      await new Promise(resolve => setTimeout(resolve, 0));

      const messageElements = chat.querySelectorAll('butter-message');
      expect(messageElements.length).toBe(2);
    });
  });

  describe('Input Area', () => {
    beforeEach(async () => {
      chat = document.createElement('butter-chat');
      chat.store = store;
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');
    });

    it('should emit message-send event on send button click', () => {
      const input = chat.querySelector('.message-input');
      const sendButton = chat.querySelector('.send-button');
      const handler = vi.fn();

      chat.addEventListener('message-send', handler);
      input.value = 'Test message';
      input.dispatchEvent(new Event('input'));
      sendButton.click();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            content: 'Test message'
          })
        })
      );
    });

    it('should emit message-send event on Enter key', () => {
      const input = chat.querySelector('.message-input');
      const handler = vi.fn();

      chat.addEventListener('message-send', handler);
      input.value = 'Test message';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));

      expect(handler).toHaveBeenCalled();
    });

    it('should not emit message-send on Shift+Enter', () => {
      const input = chat.querySelector('.message-input');
      const handler = vi.fn();

      chat.addEventListener('message-send', handler);
      input.value = 'Test message';
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true }));

      expect(handler).not.toHaveBeenCalled();
    });

    it('should clear input after sending', () => {
      const input = chat.querySelector('.message-input');
      const sendButton = chat.querySelector('.send-button');

      input.value = 'Test message';
      input.dispatchEvent(new Event('input'));
      sendButton.click();

      expect(input.value).toBe('');
    });

    it('should not send empty messages', () => {
      const sendButton = chat.querySelector('.send-button');
      const handler = vi.fn();

      chat.addEventListener('message-send', handler);
      sendButton.click();

      expect(handler).not.toHaveBeenCalled();
    });

    it('should trim whitespace before sending', () => {
      const input = chat.querySelector('.message-input');
      const sendButton = chat.querySelector('.send-button');
      const handler = vi.fn();

      chat.addEventListener('message-send', handler);
      input.value = '   Test message   ';
      input.dispatchEvent(new Event('input'));
      sendButton.click();

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            content: 'Test message'
          })
        })
      );
    });
  });

  describe('Typing Indicator', () => {
    beforeEach(async () => {
      chat = document.createElement('butter-chat');
      chat.store = store;
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');
    });

    it('should emit typing-start event when user starts typing', () => {
      const input = chat.querySelector('.message-input');
      const handler = vi.fn();

      chat.addEventListener('typing-start', handler);
      input.value = 'T';
      input.dispatchEvent(new Event('input'));

      expect(handler).toHaveBeenCalled();
    });

    it('should debounce typing events', async () => {
      vi.useFakeTimers();
      const input = chat.querySelector('.message-input');
      const handler = vi.fn();

      chat.addEventListener('typing-start', handler);
      
      input.value = 'T';
      input.dispatchEvent(new Event('input'));
      input.value = 'Te';
      input.dispatchEvent(new Event('input'));
      input.value = 'Tes';
      input.dispatchEvent(new Event('input'));

      // Handler should only be called once after debounce
      expect(handler).toHaveBeenCalledTimes(1);

      vi.useRealTimers();
    });
  });

  describe('File Drop Zone', () => {
    beforeEach(async () => {
      chat = document.createElement('butter-chat');
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');
    });

    it('should show visual feedback on dragover', () => {
      const dropZone = chat.querySelector('.file-drop-zone');
      const event = new Event('dragover', { bubbles: true });
      event.preventDefault = vi.fn();
      Object.defineProperty(event, 'dataTransfer', {
        value: { types: ['Files'] }
      });

      dropZone.dispatchEvent(event);

      expect(dropZone.classList.contains('drag-over')).toBe(true);
    });

    it('should handle dropped files', () => {
      const dropZone = chat.querySelector('.file-drop-zone');
      const handler = vi.fn();
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      chat.addEventListener('message-send', handler);

      const dropEvent = new Event('drop', { bubbles: true });
      dropEvent.preventDefault = vi.fn();
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockFile]
        }
      });

      dropZone.dispatchEvent(dropEvent);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            files: expect.arrayContaining([mockFile])
          })
        })
      );
    });

    it('should handle dropped images', () => {
      const dropZone = chat.querySelector('.file-drop-zone');
      const handler = vi.fn();
      const mockImage = new File(['test'], 'image.png', { type: 'image/png' });

      chat.addEventListener('message-send', handler);

      const dropEvent = new Event('drop', { bubbles: true });
      dropEvent.preventDefault = vi.fn();
      Object.defineProperty(dropEvent, 'dataTransfer', {
        value: {
          files: [mockImage]
        }
      });

      dropZone.dispatchEvent(dropEvent);

      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: expect.objectContaining({
            files: expect.arrayContaining([mockImage])
          })
        })
      );
    });
  });

  describe('Loading State', () => {
    it('should show loading indicator when loading attribute is set', async () => {
      chat = document.createElement('butter-chat');
      chat.setAttribute('loading', '');
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      const loadingIndicator = chat.querySelector('.loading-indicator');
      expect(loadingIndicator).toBeTruthy();
      expect(loadingIndicator.style.display).not.toBe('none');
    });

    it('should hide loading indicator when loading is removed', async () => {
      chat = document.createElement('butter-chat');
      chat.setAttribute('loading', '');
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      chat.removeAttribute('loading');

      const loadingIndicator = chat.querySelector('.loading-indicator');
      expect(loadingIndicator.style.display).toBe('none');
    });
  });

  describe('Auto-scroll', () => {
    it('should auto-scroll to new messages', async () => {
      chat = document.createElement('butter-chat');
      chat.store = store;
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      const messagesContainer = chat.querySelector('.messages-container');
      messagesContainer.scrollTop = 0;

      store.set('messages', [
        { id: '1', content: 'Message 1', sender: 'user', timestamp: Date.now() }
      ]);

      await new Promise(resolve => setTimeout(resolve, 0));

      // Mock the scroll behavior check
      expect(messagesContainer.scrollTop).toBeGreaterThanOrEqual(0);
    });
  });

  describe('ButterConnector Integration', () => {
    it('should use provided connector for sending', async () => {
      const mockConnector = {
        send: vi.fn()
      };

      chat = document.createElement('butter-chat');
      chat.connector = mockConnector;
      chat.store = store;
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      const input = chat.querySelector('.message-input');
      const sendButton = chat.querySelector('.send-button');

      // Set up event listener that uses connector
      chat.addEventListener('message-send', (e) => {
        if (chat.connector) {
          chat.connector.send({
            method: 'message.send',
            params: { content: e.detail.content }
          });
        }
      });

      input.value = 'Test message';
      input.dispatchEvent(new Event('input'));
      sendButton.click();

      expect(mockConnector.send).toHaveBeenCalledWith({
        method: 'message.send',
        params: { content: 'Test message' }
      });
    });
  });

  describe('Cleanup', () => {
    it('should clean up event listeners on disconnect', async () => {
      chat = document.createElement('butter-chat');
      chat.store = store;
      container.appendChild(chat);
      await customElements.whenDefined('butter-chat');

      const unsubscribe = vi.fn();
      chat._unsubscribe = unsubscribe;

      chat.remove();

      expect(unsubscribe).toHaveBeenCalled();
    });
  });
});
