/**
 * ButterMessage - Web Component for individual chat message bubbles
 * 
 * Attributes:
 *   - sender: 'user' | 'orchestrator' | 'system'
 *   - timestamp: ISO string or timestamp
 *   - type: 'text' | 'code' | 'image'
 *   - content: The message content
 * 
 * Events:
 *   - reply: When reply button clicked
 *   - copy: When copy button clicked
 *   - delete: When delete button clicked (user messages only)
 */
class ButterMessage extends HTMLElement {
  static get observedAttributes() {
    return ['sender', 'timestamp', 'type', 'content'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
      this.attachEventListeners();
    }
  }

  get sender() {
    return this.getAttribute('sender') || 'system';
  }

  get timestamp() {
    return this.getAttribute('timestamp') || new Date().toISOString();
  }

  get type() {
    return this.getAttribute('type') || 'text';
  }

  get content() {
    return this.getAttribute('content') || '';
  }

  formatTimestamp(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getSenderLabel() {
    const labels = {
      user: 'You',
      orchestrator: 'Orchestrator',
      system: 'System'
    };
    return labels[this.sender] || 'System';
  }

  getAvatarEmoji() {
    const emojis = {
      user: '👤',
      orchestrator: '🤖',
      system: '🔔'
    };
    return emojis[this.sender] || '🔔';
  }

  renderContent() {
    switch (this.type) {
      case 'code':
        return `<pre class="code-block"><code>${this.escapeHtml(this.content)}</code></pre>`;
      case 'image':
        return `<img class="message-image" src="${this.escapeHtml(this.content)}" alt="Image" />`;
      case 'text':
      default:
        return `<p class="message-text">${this.escapeHtml(this.content)}</p>`;
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  renderActions() {
    const actions = [
      { event: 'reply', icon: '↩️', label: 'Reply' },
      { event: 'copy', icon: '📋', label: 'Copy' }
    ];

    if (this.sender === 'user') {
      actions.push({ event: 'delete', icon: '🗑️', label: 'Delete' });
    }

    return actions.map(action => `
      <button 
        class="action-btn" 
        data-action="${action.event}" 
        title="${action.label}"
        aria-label="${action.label}"
      >
        ${action.icon}
      </button>
    `).join('');
  }

  render() {
    const senderClass = `sender-${this.sender}`;
    const typeClass = `type-${this.type}`;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          margin-bottom: 12px;
        }

        .message-wrapper {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          max-width: 100%;
        }

        .sender-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: var(--butter-avatar-bg, #e0e0e0);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
          flex-shrink: 0;
        }

        .message-content {
          flex: 1;
          min-width: 0;
        }

        .message-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 4px;
        }

        .sender-name {
          font-weight: 600;
          font-size: 14px;
          color: var(--butter-sender-color, #333);
        }

        .timestamp {
          font-size: 12px;
          color: var(--butter-timestamp-color, #888);
        }

        .message-body {
          background: var(--butter-message-bg, #f5f5f5);
          border-radius: 12px;
          padding: 10px 14px;
          word-wrap: break-word;
          overflow-wrap: break-word;
        }

        /* Sender-specific styles */
        .sender-user .message-body {
          background: var(--butter-user-message-bg, #dcf8c6);
        }

        .sender-orchestrator .message-body {
          background: var(--butter-orchestrator-message-bg, #e3f2fd);
        }

        .sender-system .message-body {
          background: var(--butter-system-message-bg, #fff3e0);
          font-style: italic;
        }

        /* Type-specific styles */
        .message-text {
          margin: 0;
          line-height: 1.5;
          color: var(--butter-text-color, #333);
        }

        .code-block {
          margin: 0;
          background: var(--butter-code-bg, #263238);
          color: var(--butter-code-color, #aed581);
          padding: 12px;
          border-radius: 8px;
          overflow-x: auto;
          font-family: 'Fira Code', 'Monaco', 'Consolas', monospace;
          font-size: 13px;
          line-height: 1.4;
        }

        .message-image {
          max-width: 100%;
          max-height: 300px;
          border-radius: 8px;
          display: block;
        }

        /* Actions */
        .message-actions {
          display: flex;
          gap: 4px;
          margin-top: 6px;
          opacity: 0;
          transition: opacity 0.2s ease;
        }

        .message-wrapper:hover .message-actions,
        :host(:focus-within) .message-actions {
          opacity: 1;
        }

        .action-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 14px;
          opacity: 0.7;
          transition: opacity 0.2s, background 0.2s;
        }

        .action-btn:hover {
          opacity: 1;
          background: var(--butter-action-hover-bg, rgba(0,0,0,0.05));
        }

        .action-btn:focus {
          outline: 2px solid var(--butter-focus-color, #4a90d9);
          outline-offset: 2px;
        }

        /* System messages - more compact */
        .sender-system .sender-avatar {
          width: 28px;
          height: 28px;
          font-size: 14px;
        }

        .sender-system .message-body {
          padding: 6px 12px;
          font-size: 13px;
        }
      </style>

      <div class="message-wrapper ${senderClass} ${typeClass}">
        <div class="sender-avatar" aria-hidden="true">
          ${this.getAvatarEmoji()}
        </div>
        <div class="message-content">
          <div class="message-header">
            <span class="sender-name">${this.escapeHtml(this.getSenderLabel())}</span>
            <time class="timestamp" datetime="${this.timestamp}">
              ${this.formatTimestamp(this.timestamp)}
            </time>
          </div>
          <div class="message-body">
            ${this.renderContent()}
          </div>
          <div class="message-actions" role="group" aria-label="Message actions">
            ${this.renderActions()}
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    const actionButtons = this.shadowRoot.querySelectorAll('.action-btn');
    
    actionButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = btn.dataset.action;
        this.dispatchEvent(new CustomEvent(action, {
          bubbles: true,
          composed: true,
          detail: {
            sender: this.sender,
            timestamp: this.timestamp,
            type: this.type,
            content: this.content
          }
        }));
      });
    });
  }
}

// Define the custom element
customElements.define('butter-message', ButterMessage);

export { ButterMessage };
export default ButterMessage;
