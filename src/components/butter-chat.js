/**
 * ButterChat - Main chat interface Web Component for OpenButter
 * 
 * Attributes:
 *   - orchestrator-id: Filter messages for specific orchestrator
 *   - loading: Show loading indicator
 * 
 * Events:
 *   - message-send: When user sends a message
 *   - typing-start: When user starts typing
 * 
 * Uses: ButterStore for messages, ButterConnector for sending
 */
import { ButterStore, butterStore } from '../services/butter-store.js';

class ButterChat extends HTMLElement {
  static get observedAttributes() {
    return ['orchestrator-id', 'loading'];
  }

  constructor() {
    super();
    
    // Default store (can be overridden)
    this._store = butterStore;
    this._connector = null;
    this._unsubscribe = null;
    this._typingTimeout = null;
  }

  get store() {
    return this._store;
  }

  set store(value) {
    this._store = value;
    if (this.isConnected) {
      this._subscribeToStore();
    }
  }

  get connector() {
    return this._connector;
  }

  set connector(value) {
    this._connector = value;
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this._subscribeToStore();
  }

  disconnectedCallback() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._typingTimeout) {
      clearTimeout(this._typingTimeout);
    }
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'loading':
        this._updateLoadingState();
        break;
      case 'orchestrator-id':
        this._renderMessages();
        break;
    }
  }

  _subscribeToStore() {
    // Unsubscribe from previous
    if (this._unsubscribe) {
      this._unsubscribe();
    }

    // Subscribe to messages changes
    this._unsubscribe = this._store.subscribe('messages', () => {
      this._renderMessages();
    });

    // Initial render
    this._renderMessages();
  }

  _getOrchestratorId() {
    return this.getAttribute('orchestrator-id');
  }

  _getMessages() {
    const messages = this._store.get('messages') || [];
    const orchestratorId = this._getOrchestratorId();

    if (orchestratorId) {
      return messages.filter(m => m.orchestratorId === orchestratorId || !m.orchestratorId);
    }

    return messages;
  }

  _renderMessages() {
    const container = this.querySelector('.messages-container');
    if (!container) return;

    const messages = this._getMessages();

    // Clear existing messages
    container.innerHTML = '';

    if (messages.length === 0) {
      container.innerHTML = `<div class="empty-state">No messages yet. Start a conversation!</div>`;
      return;
    }

    // Add butter-message elements
    for (const message of messages) {
      const messageEl = document.createElement('butter-message');
      messageEl.setAttribute('sender', message.sender || 'system');
      messageEl.setAttribute('timestamp', message.timestamp || new Date().toISOString());
      messageEl.setAttribute('type', message.type || 'text');
      messageEl.setAttribute('content', message.content || '');
      container.appendChild(messageEl);
    }

    // Auto-scroll to bottom
    this._scrollToBottom();
  }

  _scrollToBottom() {
    const container = this.querySelector('.messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  _updateLoadingState() {
    const indicator = this.querySelector('.loading-indicator');
    if (indicator) {
      indicator.style.display = this.hasAttribute('loading') ? 'block' : 'none';
    }
  }

  _sendMessage(content, files = null) {
    const trimmedContent = content.trim();
    if (!trimmedContent && !files) return;

    const detail = { content: trimmedContent };
    if (files) {
      detail.files = files;
    }

    this.dispatchEvent(new CustomEvent('message-send', {
      bubbles: true,
      composed: true,
      detail
    }));
  }

  _emitTypingStart() {
    // Debounce typing events - only emit once per debounce window
    if (this._typingTimeout) {
      // Already emitted recently, just reset the timer
      clearTimeout(this._typingTimeout);
      this._typingTimeout = setTimeout(() => {
        this._typingTimeout = null;
      }, 1000);
      return;
    }

    // First input in debounce window - emit event
    this.dispatchEvent(new CustomEvent('typing-start', {
      bubbles: true,
      composed: true
    }));

    // Start debounce window
    this._typingTimeout = setTimeout(() => {
      this._typingTimeout = null;
    }, 1000);
  }

  attachEventListeners() {
    const input = this.querySelector('.message-input');
    const sendButton = this.querySelector('.send-button');
    const dropZone = this.querySelector('.file-drop-zone');

    // Send button click
    sendButton?.addEventListener('click', () => {
      if (input?.value.trim()) {
        this._sendMessage(input.value);
        input.value = '';
      }
    });

    // Enter key to send (Shift+Enter for new line)
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.value.trim()) {
          this._sendMessage(input.value);
          input.value = '';
        }
      }
    });

    // Typing indicator
    input?.addEventListener('input', () => {
      this._emitTypingStart();
    });

    // Drag and drop
    dropZone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types?.includes('Files')) {
        dropZone.classList.add('drag-over');
      }
    });

    dropZone?.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    });

    dropZone?.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        this._sendMessage('', files);
      }
    });
  }

  render() {
    const orchestratorId = this._getOrchestratorId();

    this.innerHTML = `
      <div class="chat-header">
        <h3>Chat</h3>
        ${orchestratorId ? `<div class="orchestrator-id">${this.escapeHtml(orchestratorId)}</div>` : ''}
      </div>

      <div class="messages-container">
        <div class="empty-state">No messages yet. Start a conversation!</div>
      </div>

      <div class="loading-indicator" style="display: ${this.hasAttribute('loading') ? 'block' : 'none'};">
        <span>Loading...</span>
      </div>

      <div class="chat-input-area">
        <div class="file-drop-zone">
          Drop files here or type a message below
        </div>
        <div class="input-wrapper">
          <textarea 
            class="message-input" 
            placeholder="Type a message..."
            rows="1"
            aria-label="Message input"
          ></textarea>
          <button class="send-button" aria-label="Send message">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Define the custom element
customElements.define('butter-chat', ButterChat);

export { ButterChat };
export default ButterChat;
