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
    background: var(--butter-sidebar-bg, #1a1a2e);
    color: var(--butter-sidebar-text, #eaeaea);
    border-right: 1px solid var(--butter-border-color, #2d2d44);
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
    border-bottom: 1px solid var(--butter-border-color, #2d2d44);
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
    color: var(--butter-sidebar-text, #eaeaea);
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
    background: var(--butter-hover-bg, #2d2d44);
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
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.2s ease;
    border: 2px solid transparent;
  }

  .orchestrator-item:hover {
    background: var(--butter-hover-bg, #2d2d44);
  }

  .orchestrator-item.active {
    background: var(--butter-active-bg, #3d3d5c);
    border-color: var(--butter-accent, #6c5dd3);
  }

  .orchestrator-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--butter-accent, #6c5dd3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 14px;
    flex-shrink: 0;
    position: relative;
  }

  .status-dot {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid var(--butter-sidebar-bg, #1a1a2e);
  }

  .status-dot.online {
    background: #4ade80;
  }

  .status-dot.offline {
    background: #9ca3af;
  }

  .status-dot.busy {
    background: #fbbf24;
  }

  .status-dot.error {
    background: #f87171;
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

  .orchestrator-name {
    font-weight: 500;
    font-size: 14px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .orchestrator-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--butter-muted-text, #9ca3af);
  }

  .recent-activity {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .token-burn {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .token-burn::before {
    content: '🔥';
    font-size: 10px;
  }

  .sidebar-footer {
    padding: 16px;
    border-top: 1px solid var(--butter-border-color, #2d2d44);
  }

  .collapsed .sidebar-footer {
    padding: 8px;
  }

  .new-orchestrator {
    width: 100%;
    padding: 12px;
    background: var(--butter-accent, #6c5dd3);
    color: white;
    border: none;
    border-radius: 8px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.1s ease;
  }

  .new-orchestrator:hover {
    background: var(--butter-accent-hover, #5a4ec2);
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
    color: var(--butter-muted-text, #9ca3af);
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
    background: var(--butter-border-color, #2d2d44);
    border-radius: 3px;
  }

  .orchestrator-list::-webkit-scrollbar-thumb:hover {
    background: var(--butter-muted-text, #9ca3af);
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
    const recentActivity = orchestrator.recentActivity || 'No recent activity';
    const tokenBurn = this.#formatTokenBurn(orchestrator.tokenBurn);
    const initials = orchestrator.name.slice(0, 2).toUpperCase();

    item.innerHTML = `
      <div class="orchestrator-avatar">
        ${initials}
        <span class="status-dot ${statusClass}"></span>
      </div>
      <div class="orchestrator-info">
        <div class="orchestrator-name">${this.#escapeHtml(orchestrator.name)}</div>
        <div class="orchestrator-meta">
          <span class="recent-activity">${this.#escapeHtml(recentActivity)}</span>
          <span class="token-burn">${tokenBurn}</span>
        </div>
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
   * Format token burn number with commas
   * @private
   * @param {number} value
   * @returns {string}
   */
  #formatTokenBurn(value) {
    const num = Number(value) || 0;
    return num.toLocaleString();
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
