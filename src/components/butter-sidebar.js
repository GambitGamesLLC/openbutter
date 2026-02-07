/**
 * ButterSidebar - Orchestrator list and navigation sidebar
 *
 * A custom web component that displays a list of orchestrators with their
 * status, recent activity, and token burn. Supports collapse/expand and
 * selection of orchestrators.
 *
 * @example
 * <butter-sidebar active-id="orch-1" collapsed></butter-sidebar>
 */

import { butterStore } from '../services/butter-store.js';

// CSS styles for the component
const styles = `
  :host {
    display: block;
    height: 100%;
  }

  .sidebar {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--butter-sidebar-bg, #1e293b);
    color: var(--butter-sidebar-text, #f8fafc);
    border-right: 1px solid var(--butter-border-color, #334155);
    transition: width 0.3s ease;
    width: 280px;
    overflow: hidden;
  }

  .sidebar.collapsed {
    width: 64px;
  }

  .sidebar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--butter-border-color, #334155);
  }

  .sidebar-title {
    font-size: 18px;
    font-weight: 600;
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .collapsed .sidebar-title {
    display: none;
  }

  .collapse-toggle {
    background: none;
    border: none;
    color: var(--butter-sidebar-text, #f8fafc);
    cursor: pointer;
    font-size: 16px;
    padding: 8px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.2s ease;
  }

  .collapse-toggle:hover {
    background: var(--butter-hover-bg, #334155);
  }

  .collapse-icon {
    transition: transform 0.3s ease;
  }

  .collapsed .collapse-icon {
    transform: rotate(180deg);
  }

  .orchestrator-list {
    flex: 1;
    overflow-y: auto;
    padding: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .collapsed .orchestrator-list {
    padding: 8px 4px;
  }

  .orchestrator-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s ease;
    border: 2px solid transparent;
    height: 60px;
  }

  .orchestrator-item:hover {
    background: var(--butter-hover-bg, #334155);
  }

  .orchestrator-item.active {
    background: var(--butter-active-bg, #334155);
    border-color: var(--butter-accent, #6366f1);
  }

  .orchestrator-avatar {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--butter-accent, #6366f1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
  }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
    margin-left: auto;
  }

  .status-dot.online {
    background: #10b981;
  }

  .status-dot.offline {
    background: #6b7280;
  }

  .status-dot.busy {
    background: #f59e0b;
    animation: pulse 2s ease-in-out infinite;
  }

  .status-dot.error {
    background: #ef4444;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .orchestrator-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .collapsed .orchestrator-info {
    display: none;
  }

  .orchestrator-name-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  }

  .orchestrator-name {
    font-weight: 600;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--butter-sidebar-text, #f8fafc);
  }

  .orchestrator-status {
    font-size: 12px;
    color: var(--butter-muted-text, #94a3b8);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--butter-border-color, #334155);
  }

  .collapsed .sidebar-footer {
    padding: 8px;
  }

  .new-orchestrator {
    width: 100%;
    padding: 12px;
    background: var(--butter-accent, #6366f1);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
  }

  .new-orchestrator:hover {
    background: var(--butter-accent-hover, #4f46e5);
  }

  .new-orchestrator:active {
    transform: translateY(1px);
  }

  .collapsed .new-orchestrator {
    padding: 12px 8px;
    font-size: 20px;
  }

  .collapsed .new-orchestrator-text {
    display: none;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    text-align: center;
    color: var(--butter-muted-text, #94a3b8);
  }

  .empty-state-icon {
    font-size: 48px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  .empty-state-text {
    font-size: 14px;
  }

  /* Scrollbar styles */
  .orchestrator-list::-webkit-scrollbar {
    width: 6px;
  }

  .orchestrator-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .orchestrator-list::-webkit-scrollbar-thumb {
    background: var(--butter-border-color, #334155);
    border-radius: 3px;
  }

  .orchestrator-list::-webkit-scrollbar-thumb:hover {
    background: var(--butter-muted-text, #64748b);
  }
`;

export class ButterSidebar extends HTMLElement {
  /**
   * @type {ShadowRoot}
   */
  #shadow;

  /**
   * @type {Function|null}
   */
  #unsubscribe = null;

  /**
   * @type {Array<Object>}
   */
  #orchestrators = [];

  /**
   * @type {Map<string, HTMLElement>}
   */
  #itemElements = new Map();

  static get observedAttributes() {
    return ['active-id', 'collapsed'];
  }

  constructor() {
    super();
    this.#shadow = this.attachShadow({ mode: 'open' });
  }

  /**
   * Get the active orchestrator ID
   * @returns {string|null}
   */
  get activeId() {
    return this.getAttribute('active-id');
  }

  /**
   * Set the active orchestrator ID
   * @param {string|null} value
   */
  set activeId(value) {
    if (value) {
      this.setAttribute('active-id', value);
    } else {
      this.removeAttribute('active-id');
    }
  }

  /**
   * Get collapsed state
   * @returns {boolean}
   */
  get collapsed() {
    return this.hasAttribute('collapsed');
  }

  /**
   * Set collapsed state
   * @param {boolean} value
   */
  set collapsed(value) {
    if (value) {
      this.setAttribute('collapsed', '');
    } else {
      this.removeAttribute('collapsed');
    }
  }

  connectedCallback() {
    console.log('[Sidebar] connectedCallback - mounting');
    this.#renderInitial();
    this.#subscribeToStore();
    this.#bindEvents();
  }

  disconnectedCallback() {
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    this.#itemElements.clear();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    switch (name) {
      case 'active-id':
        this.#updateActiveState();
        break;
      case 'collapsed':
        this.#updateCollapsedState();
        break;
    }
  }

  /**
   * Subscribe to ButterStore orchestrators changes
   * @private
   */
  #subscribeToStore() {
    // Initial load
    this.#orchestrators = butterStore.get('orchestrators') || [];
    console.log('[Sidebar] Initial orchestrators:', this.#orchestrators.length);
    console.log('[Sidebar] Initial orchestrator IDs:', this.#orchestrators.map(o => ({ id: o.id, name: o.name, tokenBurn: o.tokenBurn })));
    this.#renderOrchestrators();

    // Subscribe to changes
    this.#unsubscribe = butterStore.subscribe('orchestrators', (orchestrators) => {
      console.log('[Sidebar] Store updated, orchestrators:', orchestrators?.length || 0);
      console.log('[Sidebar] Updated orchestrator IDs:', orchestrators?.map(o => ({ id: o.id, name: o.name, tokenBurn: o.tokenBurn })));
      // Always create a new array reference to ensure reactivity
      this.#orchestrators = orchestrators ? [...orchestrators] : [];
      this.#renderOrchestrators();
    });
  }

  /**
   * Bind DOM events
   * @private
   */
  #bindEvents() {
    const toggle = this.#shadow.querySelector('.collapse-toggle');
    const newButton = this.#shadow.querySelector('.new-orchestrator');

    toggle?.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
    });

    newButton?.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('orchestrator-create', {
        bubbles: true,
        composed: true
      }));
    });

    const list = this.#shadow.querySelector('.orchestrator-list');
    list?.addEventListener('click', (e) => {
      const item = e.target.closest('.orchestrator-item');
      if (!item) return;

      const orchestratorId = item.dataset.id;
      const orchestrator = this.#orchestrators.find(o => o.id === orchestratorId);

      if (orchestrator) {
        this.activeId = orchestratorId;
        this.dispatchEvent(new CustomEvent('orchestrator-select', {
          detail: {
            id: orchestrator.id,
            name: orchestrator.name
          },
          bubbles: true,
          composed: true
        }));
      }
    });
  }

  /**
   * Render the initial static structure
   * @private
   */
  #renderInitial() {
    const styleSheet = document.createElement('style');
    styleSheet.textContent = styles;

    const container = document.createElement('div');
    container.className = 'sidebar';
    if (this.collapsed) {
      container.classList.add('collapsed');
    }

    container.innerHTML = `
      <header class="sidebar-header">
        <h2 class="sidebar-title">Orchestrators</h2>
        <button class="collapse-toggle" aria-label="Toggle sidebar">
          <span class="collapse-icon">◀</span>
        </button>
      </header>
      <nav class="orchestrator-list"></nav>
      <footer class="sidebar-footer">
        <button class="new-orchestrator">
          <span class="new-orchestrator-text">+ New</span>
        </button>
      </footer>
    `;

    this.#shadow.appendChild(styleSheet);
    this.#shadow.appendChild(container);
  }

  /**
   * Render the orchestrators list
   * @private
   */
  #renderOrchestrators() {
    const list = this.#shadow.querySelector('.orchestrator-list');
    if (!list) return;

    console.log('[Sidebar] Rendering orchestrators:', this.#orchestrators.map(o => ({ id: o.id, name: o.name, tokenBurn: o.tokenBurn })));

    // Clear existing items
    list.innerHTML = '';
    this.#itemElements.clear();

    if (this.#orchestrators.length === 0) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🦋</div>
          <div class="empty-state-text">
            No orchestrators yet<br>
            Create one to get started
          </div>
        </div>
      `;
      return;
    }

    this.#orchestrators.forEach(orchestrator => {
      console.log(`[Sidebar] Creating item for orchestrator: ${orchestrator.id} (${orchestrator.name})`);
      const item = this.#createOrchestratorItem(orchestrator);
      list.appendChild(item);
      this.#itemElements.set(orchestrator.id, item);
    });

    console.log(`[Sidebar] Rendered ${this.#itemElements.size} items`);
    this.#updateActiveState();
  }

  /**
   * Create an orchestrator item element
   * @private
   * @param {Object} orchestrator
   * @returns {HTMLElement}
   */
  #createOrchestratorItem(orchestrator) {
    const item = document.createElement('div');
    item.className = 'orchestrator-item';
    item.dataset.id = orchestrator.id;

    const statusClass = orchestrator.status || 'offline';
    const statusText = this.#getStatusText(orchestrator.status, orchestrator.state);
    const initials = orchestrator.name.slice(0, 2).toUpperCase();

    item.innerHTML = `
      <div class="orchestrator-avatar">
        ${initials}
      </div>
      <div class="orchestrator-info">
        <div class="orchestrator-name-row">
          <span class="orchestrator-name">${this.#escapeHtml(orchestrator.name)}</span>
          <span class="status-dot ${statusClass}"></span>
        </div>
        <div class="orchestrator-status">${this.#escapeHtml(statusText)}</div>
      </div>
    `;

    return item;
  }

  /**
   * Update the active state styling
   * @private
   */
  #updateActiveState() {
    this.#itemElements.forEach((element, id) => {
      element.classList.toggle('active', id === this.activeId);
    });
  }

  /**
   * Update the collapsed state
   * @private
   */
  #updateCollapsedState() {
    const sidebar = this.#shadow.querySelector('.sidebar');
    if (sidebar) {
      sidebar.classList.toggle('collapsed', this.collapsed);
    }
  }

  /**
   * Get human-readable status text
   * @private
   * @param {string} status
   * @param {string} state
   * @returns {string}
   */
  #getStatusText(status, state) {
    const stateMap = {
      'idle': 'Ready',
      'ready': 'Ready',
      'thinking': 'Processing...',
      'working': 'Working...',
      'busy': 'Busy',
      'error': 'Connection lost',
      'offline': 'Offline'
    };
    
    // First check state, then fall back to status
    if (state && stateMap[state]) {
      return stateMap[state];
    }
    
    if (status && stateMap[status]) {
      return stateMap[status];
    }
    
    return 'Ready';
  }

  /**
   * Escape HTML to prevent XSS
   * @private
   * @param {string} text
   * @returns {string}
   */
  #escapeHtml(text) {
    if (typeof text !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Re-render the component (public API)
   * Can be called externally to force a refresh
   */
  render() {
    this.#renderOrchestrators();
  }

  /**
   * Force refresh orchestrators from store
   * Useful when orchestrators are discovered externally
   */
  refresh() {
    this.#orchestrators = butterStore.get('orchestrators') || [];
    this.#renderOrchestrators();
  }
}

// Define the custom element
customElements.define('butter-sidebar', ButterSidebar);

export default ButterSidebar;
