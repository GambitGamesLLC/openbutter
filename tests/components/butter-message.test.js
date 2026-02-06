import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import '../../src/components/butter-message.js';

describe('ButterMessage Component', () => {
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  function createMessage(props = {}) {
    const el = document.createElement('butter-message');
    Object.entries(props).forEach(([key, value]) => {
      if (value !== undefined) {
        el.setAttribute(key, value);
      }
    });
    container.appendChild(el);
    return el;
  }

  describe('Basic Rendering', () => {
    it('should render with default attributes', () => {
      const el = createMessage();
      
      expect(el.shadowRoot).toBeTruthy();
      expect(el.sender).toBe('system');
      expect(el.type).toBe('text');
    });

    it('should render user message', () => {
      const el = createMessage({
        sender: 'user',
        content: 'Hello world',
        timestamp: '2024-01-15T10:30:00Z'
      });

      const shadow = el.shadowRoot;
      expect(shadow.querySelector('.sender-name').textContent).toBe('You');
      expect(shadow.querySelector('.sender-avatar').textContent).toContain('👤');
      expect(shadow.querySelector('.message-text').textContent).toBe('Hello world');
    });

    it('should render orchestrator message', () => {
      const el = createMessage({
        sender: 'orchestrator',
        content: 'How can I help you?'
      });

      const shadow = el.shadowRoot;
      expect(shadow.querySelector('.sender-name').textContent).toBe('Orchestrator');
      expect(shadow.querySelector('.sender-avatar').textContent).toContain('🤖');
    });

    it('should render system message', () => {
      const el = createMessage({
        sender: 'system',
        content: 'Connection established'
      });

      const shadow = el.shadowRoot;
      expect(shadow.querySelector('.sender-name').textContent).toBe('System');
      expect(shadow.querySelector('.sender-avatar').textContent).toContain('🔔');
    });
  });

  describe('Message Types', () => {
    it('should render text message', () => {
      const el = createMessage({
        type: 'text',
        content: 'Plain text message'
      });

      const shadow = el.shadowRoot;
      expect(shadow.querySelector('.message-text').textContent).toBe('Plain text message');
      expect(shadow.querySelector('.type-text')).toBeTruthy();
    });

    it('should render code block', () => {
      const el = createMessage({
        type: 'code',
        content: 'const x = 42;'
      });

      const shadow = el.shadowRoot;
      const codeBlock = shadow.querySelector('.code-block');
      expect(codeBlock).toBeTruthy();
      expect(codeBlock.querySelector('code').textContent).toBe('const x = 42;');
    });

    it('should render image', () => {
      const el = createMessage({
        type: 'image',
        content: 'https://example.com/image.png'
      });

      const shadow = el.shadowRoot;
      const img = shadow.querySelector('.message-image');
      expect(img).toBeTruthy();
      expect(img.src).toBe('https://example.com/image.png');
    });
  });

  describe('Timestamp Formatting', () => {
    it('should format timestamp correctly', () => {
      const el = createMessage({
        timestamp: '2024-01-15T14:30:00Z'
      });

      const shadow = el.shadowRoot;
      const timeEl = shadow.querySelector('time');
      expect(timeEl).toBeTruthy();
      expect(timeEl.getAttribute('datetime')).toBe('2024-01-15T14:30:00Z');
    });
  });

  describe('HTML Escaping', () => {
    it('should escape HTML in content', () => {
      const el = createMessage({
        content: '<script>alert("xss")</script>'
      });

      const shadow = el.shadowRoot;
      const text = shadow.querySelector('.message-text');
      expect(text.textContent).toBe('<script>alert("xss")</script>');
      expect(text.innerHTML).not.toContain('<script>');
    });
  });

  describe('Actions', () => {
    it('should render reply and copy actions for all senders', () => {
      const el = createMessage({
        sender: 'orchestrator',
        content: 'Test'
      });

      const shadow = el.shadowRoot;
      const buttons = shadow.querySelectorAll('.action-btn');
      const actions = Array.from(buttons).map(btn => btn.dataset.action);
      
      expect(actions).toContain('reply');
      expect(actions).toContain('copy');
      expect(actions).not.toContain('delete');
    });

    it('should render delete action for user messages', () => {
      const el = createMessage({
        sender: 'user',
        content: 'Test'
      });

      const shadow = el.shadowRoot;
      const buttons = shadow.querySelectorAll('.action-btn');
      const actions = Array.from(buttons).map(btn => btn.dataset.action);
      
      expect(actions).toContain('reply');
      expect(actions).toContain('copy');
      expect(actions).toContain('delete');
    });

    it('should not render delete action for non-user messages', () => {
      const el = createMessage({
        sender: 'orchestrator',
        content: 'Test'
      });

      const shadow = el.shadowRoot;
      const buttons = shadow.querySelectorAll('.action-btn');
      const actions = Array.from(buttons).map(btn => btn.dataset.action);
      
      expect(actions).not.toContain('delete');
    });

    it('should dispatch reply event', () => {
      const el = createMessage({
        sender: 'user',
        content: 'Hello'
      });

      const handler = vi.fn();
      el.addEventListener('reply', handler);

      const shadow = el.shadowRoot;
      const replyBtn = shadow.querySelector('[data-action="reply"]');
      replyBtn.click();

      expect(handler).toHaveBeenCalledOnce();
      expect(handler.mock.calls[0][0].detail).toEqual({
        sender: 'user',
        timestamp: expect.any(String),
        type: 'text',
        content: 'Hello'
      });
    });

    it('should dispatch copy event', () => {
      const el = createMessage({
        sender: 'orchestrator',
        content: 'Response'
      });

      const handler = vi.fn();
      el.addEventListener('copy', handler);

      const shadow = el.shadowRoot;
      const copyBtn = shadow.querySelector('[data-action="copy"]');
      copyBtn.click();

      expect(handler).toHaveBeenCalledOnce();
    });

    it('should dispatch delete event for user messages', () => {
      const el = createMessage({
        sender: 'user',
        content: 'To be deleted'
      });

      const handler = vi.fn();
      el.addEventListener('delete', handler);

      const shadow = el.shadowRoot;
      const deleteBtn = shadow.querySelector('[data-action="delete"]');
      deleteBtn.click();

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('Dynamic Updates', () => {
    it('should re-render when attributes change', () => {
      const el = createMessage({
        sender: 'user',
        content: 'Original'
      });

      let shadow = el.shadowRoot;
      expect(shadow.querySelector('.message-text').textContent).toBe('Original');

      el.setAttribute('content', 'Updated');
      
      shadow = el.shadowRoot;
      expect(shadow.querySelector('.message-text').textContent).toBe('Updated');
    });

    it('should update sender styling when changed', () => {
      const el = createMessage({
        sender: 'user'
      });

      let shadow = el.shadowRoot;
      expect(shadow.querySelector('.sender-user')).toBeTruthy();

      el.setAttribute('sender', 'orchestrator');
      
      shadow = el.shadowRoot;
      expect(shadow.querySelector('.sender-orchestrator')).toBeTruthy();
      expect(shadow.querySelector('.sender-name').textContent).toBe('Orchestrator');
    });
  });

  describe('CSS Classes', () => {
    it('should apply correct CSS classes based on sender', () => {
      const el = createMessage({ sender: 'user' });
      expect(el.shadowRoot.querySelector('.sender-user')).toBeTruthy();

      el.setAttribute('sender', 'orchestrator');
      expect(el.shadowRoot.querySelector('.sender-orchestrator')).toBeTruthy();

      el.setAttribute('sender', 'system');
      expect(el.shadowRoot.querySelector('.sender-system')).toBeTruthy();
    });

    it('should apply correct CSS classes based on type', () => {
      const el = createMessage({ type: 'text' });
      expect(el.shadowRoot.querySelector('.type-text')).toBeTruthy();

      el.setAttribute('type', 'code');
      expect(el.shadowRoot.querySelector('.type-code')).toBeTruthy();

      el.setAttribute('type', 'image');
      expect(el.shadowRoot.querySelector('.type-image')).toBeTruthy();
    });
  });
});
