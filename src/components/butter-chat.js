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
    
    // Store bound event handlers for proper cleanup
    this._boundHandlers = {
      sendClick: null,
      keydown: null,
      input: null,
      dragover: null,
      dragleave: null,
      drop: null
    };
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
      this._typingTimeout = null;
    }
    this._removeEventListeners();
  }

  _removeEventListeners() {
    const input = this.querySelector('.message-input');
    const sendButton = this.querySelector('.send-btn');
    const dropZone = this.querySelector('.file-drop-zone');

    if (sendButton && this._boundHandlers.sendClick) {
      sendButton.removeEventListener('click', this._boundHandlers.sendClick);
    }
    if (input) {
      if (this._boundHandlers.keydown) {
        input.removeEventListener('keydown', this._boundHandlers.keydown);
      }
      if (this._boundHandlers.input) {
        input.removeEventListener('input', this._boundHandlers.input);
      }
    }
    if (dropZone) {
      if (this._boundHandlers.dragover) {
        dropZone.removeEventListener('dragover', this._boundHandlers.dragover);
      }
      if (this._boundHandlers.dragleave) {
        dropZone.removeEventListener('dragleave', this._boundHandlers.dragleave);
      }
      if (this._boundHandlers.drop) {
        dropZone.removeEventListener('drop', this._boundHandlers.drop);
      }
    }
    this._boundHandlers = {
      sendClick: null,
      keydown: null,
      input: null,
      dragover: null,
      dragleave: null,
      drop: null
    };
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
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-logo">🧈</div>
          <div class="empty-state-text">
            <strong>Welcome to OpenButter</strong><br>
            Start a conversation or try one of these:
          </div>
          <div class="starter-chips">
            <button class="starter-chip" data-prompt="Check system health">🔍 Check System Health</button>
            <button class="starter-chip" data-prompt="Deploy to staging">🚀 Deploy to Staging</button>
            <button class="starter-chip" data-prompt="Review recent logs">📋 Review Recent Logs</button>
          </div>
        </div>
      `;
      
      // Attach starter chip listeners
      container.querySelectorAll('.starter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const prompt = chip.dataset.prompt;
          this._sendMessage(prompt);
        });
      });
      
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
    // Remove any existing listeners before re-attaching
    this._removeEventListeners();

    const input = this.querySelector('.message-input');
    const sendButton = this.querySelector('.send-btn');
    const dropZone = this.querySelector('.file-drop-zone');

    // Create bound handler references for proper cleanup
    this._boundHandlers.sendClick = () => {
      if (input?.value.trim()) {
        this._sendMessage(input.value);
        input.value = '';
      }
    };

    this._boundHandlers.keydown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.value.trim()) {
          this._sendMessage(input.value);
          input.value = '';
        }
      }
    };

    this._boundHandlers.input = () => {
      this._emitTypingStart();
    };

    this._boundHandlers.dragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.types?.includes('Files')) {
        dropZone.classList.add('drag-over');
      }
    };

    this._boundHandlers.dragleave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');
    };

    this._boundHandlers.drop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-over');

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0) {
        this._sendMessage('', files);
      }
    };

    // Attach event listeners using stored bound handlers
    sendButton?.addEventListener('click', this._boundHandlers.sendClick);
    input?.addEventListener('keydown', this._boundHandlers.keydown);
    input?.addEventListener('input', this._boundHandlers.input);
    dropZone?.addEventListener('dragover', this._boundHandlers.dragover);
    dropZone?.addEventListener('dragleave', this._boundHandlers.dragleave);
    dropZone?.addEventListener('drop', this._boundHandlers.drop);
  }

  render() {
    const orchestratorId = this._getOrchestratorId();

    this.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: var(--chat-bg, #0f172a);
          color: var(--chat-text, #f8fafc);
        }

        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 20px;
          border-bottom: 1px solid var(--border-color, #334155);
          flex-shrink: 0;
        }

        .chat-header h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #f8fafc);
        }

        .orchestrator-id {
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
          font-family: monospace;
        }

        .messages-container {
          flex: 1;
          overflow-y: auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .messages-container::-webkit-scrollbar {
          width: 8px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: var(--border-color, #334155);
          border-radius: 4px;
        }

        /* Empty state styling */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--text-muted, #94a3b8);
          gap: 24px;
        }

        .empty-state-logo {
          font-size: 64px;
          opacity: 0.2;
        }

        .empty-state-text {
          font-size: 16px;
          max-width: 400px;
          line-height: 1.6;
        }

        .starter-chips {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
        }

        .starter-chip {
          background: var(--bg-secondary, #1e293b);
          border: 1px solid var(--border-color, #334155);
          color: var(--text-primary, #f8fafc);
          padding: 12px 20px;
          border-radius: 8px;
          cursor: pointer;
          font-size: 14px;
          transition: background 0.2s, border-color 0.2s;
          text-align: left;
          min-width: 280px;
        }

        .starter-chip:hover {
          background: var(--bg-hover, #334155);
          border-color: var(--border-hover, #475569);
        }

        /* Message styling */
        butter-message {
          display: block;
        }

        butter-message[sender="user"] {
          align-self: flex-end;
          max-width: 80%;
        }

        butter-message[sender="orchestrator"],
        butter-message[sender="system"] {
          align-self: flex-start;
          max-width: 80%;
        }

        /* Loading indicator */
        .loading-indicator {
          padding: 12px 20px;
          text-align: center;
          color: var(--text-muted, #94a3b8);
          font-size: 14px;
          flex-shrink: 0;
        }

        /* Chat input area - Floating pill design */
        .chat-input-wrapper {
          padding: 16px 20px 24px;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .chat-input-pill {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          background: var(--input-bg, #334155);
          border: 1px solid var(--border-color, #475569);
          border-radius: 24px;
          padding: 12px 16px;
          min-height: 48px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .chat-input-pill:focus-within {
          border-color: var(--accent, #6366f1);
          box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.2);
        }

        .attach-btn {
          background: none;
          border: none;
          color: var(--text-muted, #94a3b8);
          cursor: pointer;
          padding: 4px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.2s, background 0.2s;
          flex-shrink: 0;
        }

        .attach-btn:hover {
          color: var(--text-primary, #f8fafc);
          background: var(--bg-hover, #475569);
        }

        .message-input {
          flex: 1;
          background: none;
          border: none;
          color: var(--text-primary, #f8fafc);
          font-size: 16px;
          line-height: 1.5;
          resize: none;
          outline: none;
          min-height: 24px;
          max-height: 200px;
          font-family: inherit;
        }

        .message-input::placeholder {
          color: var(--text-muted, #64748b);
        }

        .send-btn {
          background: var(--accent, #6366f1);
          border: none;
          color: white;
          cursor: pointer;
          padding: 8px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s, transform 0.1s;
          flex-shrink: 0;
        }

        .send-btn:hover {
          background: var(--accent-hover, #4f46e5);
        }

        .send-btn:active {
          transform: scale(0.95);
        }

        .send-btn:disabled {
          background: var(--border-color, #475569);
          cursor: not-allowed;
        }

        /* File drop zone */
        .file-drop-zone {
          display: none;
          position: absolute;
          top: 56px;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.9);
          border: 2px dashed var(--accent, #6366f1);
          border-radius: 12px;
          margin: 20px;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, #94a3b8);
          font-size: 16px;
          z-index: 10;
        }

        .file-drop-zone.drag-over {
          display: flex;
          background: rgba(99, 102, 241, 0.1);
          color: var(--accent, #6366f1);
        }

        /* Token counter */
        .token-counter {
          text-align: right;
          font-size: 12px;
          color: var(--text-muted, #94a3b8);
          font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace;
          opacity: 0.6;
          padding-right: 20px;
        }

        .token-counter:hover {
          opacity: 1;
        }
      </style>

      <div class="chat-header">
        <h3>Chat</h3>
        ${orchestratorId ? `<div class="orchestrator-id">${this.escapeHtml(orchestratorId)}</div>` : ''}
      </div>

      <div class="file-drop-zone">
        Drop files here to upload
      </div>

      <div class="messages-container">
        <div class="empty-state">
          <div class="empty-state-logo">🧈</div>
          <div class="empty-state-text">
            <strong>Welcome to OpenButter</strong><br>
            Start a conversation or try one of these:
          </div>
          <div class="starter-chips">
            <button class="starter-chip" data-prompt="Check system health">🔍 Check System Health</button>
            <button class="starter-chip" data-prompt="Deploy to staging">🚀 Deploy to Staging</button>
            <button class="starter-chip" data-prompt="Review recent logs">📋 Review Recent Logs</button>
          </div>
        </div>
      </div>

      <div class="loading-indicator" style="display: ${this.hasAttribute('loading') ? 'block' : 'none'};">
        <span>Loading...</span>
      </div>

      <div class="chat-input-wrapper">
        <div class="chat-input-pill">
          <button class="attach-btn" aria-label="Attach file">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          <textarea 
            class="message-input" 
            placeholder="Type a message..."
            rows="1"
            aria-label="Message input"
          ></textarea>
          <button class="send-btn" aria-label="Send message">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"></line>
              <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
            </svg>
          </button>
        </div>
        <div class="token-counter">Model: Kimi K2.5 • 0 tokens</div>
      </div>
    `;

    // Attach starter chip listeners
    this.querySelectorAll('.starter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const prompt = chip.dataset.prompt;
        this._sendMessage(prompt);
      });
    });
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
