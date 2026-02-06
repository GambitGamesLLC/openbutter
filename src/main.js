/**
 * OpenButter - Main Entry Point
 *
 * Initializes the application, registers web components,
 * and mounts the app to the DOM.
 */

import { ButterStore } from './services/butter-store.js';
import { ButterConnector } from './services/butter-connector-browser.js';
import { autoLogger } from './utils/auto-logger.js';

// Import UI components
import './components/butter-sidebar.js';
import './components/butter-chat.js';
import './components/butter-settings.js';

// Initialize auto-logger early to capture all console output to file
// This allows subagents to read logs via the log server
autoLogger.init();

// App version for debugging
const APP_VERSION = '0.1.0';

console.log(`🧈 OpenButter v${APP_VERSION} starting...`);

/**
 * Error Boundary - Catches and displays runtime errors
 */
function renderError(error, container) {
  container.innerHTML = `
    <div class="error-boundary">
      <h1>⚠️ Something went wrong</h1>
      <p>${error.message || 'An unexpected error occurred'}</p>
      <button onclick="location.reload()">Reload Page</button>
    </div>
  `;
}

/**
 * Main ButterApp component - Full chat application UI
 */
class ButterApp extends HTMLElement {
  constructor() {
    super();
    this.connector = null;
    this.store = null;
    this._boundHandlers = {
      connected: null,
      disconnected: null
    };
  }

  connectedCallback() {
    this.render();
    this.attachEventListeners();
    this.updateConnectionStatus();
  }

  disconnectedCallback() {
    this._removeConnectorListeners();
    this._detachEventListeners();
  }

  render() {
    this.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: var(--bg-primary, #1a1a2e);
          color: var(--text-primary, #eaeaea);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1.25rem;
          background: var(--bg-secondary, #16213e);
          border-bottom: 1px solid var(--border-color, #2d3748);
          flex-shrink: 0;
          height: 56px;
          box-sizing: border-box;
        }

        .app-header h1 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary, #eaeaea);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        #connection-status {
          font-size: 0.875rem;
          color: var(--text-secondary, #a0aec0);
          display: flex;
          align-items: center;
          gap: 0.375rem;
        }

        #connection-status.connected {
          color: var(--success, #48bb78);
        }

        #connection-status.disconnected {
          color: var(--error, #f56565);
        }

        #settings-btn {
          background: var(--bg-tertiary, #1f2937);
          border: 1px solid var(--border-color, #2d3748);
          color: var(--text-primary, #eaeaea);
          padding: 0.5rem 0.875rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 0.375rem;
          transition: background 0.15s ease, border-color 0.15s ease;
        }

        #settings-btn:hover {
          background: var(--bg-hover, #374151);
          border-color: var(--border-hover, #4a5568);
        }

        #settings-btn:active {
          background: var(--bg-active, #2d3748);
        }

        .app-layout {
          display: flex;
          flex: 1;
          height: calc(100vh - 56px);
          overflow: hidden;
        }

        butter-sidebar {
          width: 280px;
          flex-shrink: 0;
          border-right: 1px solid var(--border-color, #2d3748);
          background: var(--bg-secondary, #16213e);
          overflow-y: auto;
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-primary, #1a1a2e);
          position: relative;
        }

        butter-chat {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        #settings-panel {
          position: fixed;
          top: 56px;
          right: 0;
          width: 360px;
          height: calc(100vh - 56px);
          background: var(--bg-secondary, #16213e);
          border-left: 1px solid var(--border-color, #2d3748);
          box-shadow: -4px 0 16px rgba(0, 0, 0, 0.3);
          z-index: 100;
          overflow-y: auto;
        }

        #settings-panel.hidden {
          display: none !important;
        }

        /* Scrollbar styling for dark theme */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }

        ::-webkit-scrollbar-track {
          background: var(--bg-secondary, #16213e);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--border-color, #2d3748);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--border-hover, #4a5568);
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          butter-sidebar {
            position: absolute;
            left: 0;
            top: 56px;
            height: calc(100vh - 56px);
            z-index: 50;
            transform: translateX(-100%);
            transition: transform 0.2s ease;
          }

          butter-sidebar.open {
            transform: translateX(0);
          }

          #settings-panel {
            width: 100%;
          }
        }

        /* Error boundary styles */
        .error-boundary {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          padding: 2rem;
          text-align: center;
          background: var(--bg-primary, #1a1a2e);
          color: var(--text-primary, #eaeaea);
        }

        .error-boundary h1 {
          color: var(--error, #f56565);
          margin-bottom: 1rem;
        }

        .error-boundary button {
          margin-top: 1.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent, #3182ce);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
        }

        .error-boundary button:hover {
          background: var(--accent-hover, #2c5282);
        }
      </style>

      <header class="app-header">
        <h1>🧈 OpenButter</h1>
        <div class="header-actions">
          <span id="connection-status">Connecting...</span>
          <button id="settings-btn">⚙️ Settings</button>
        </div>
      </header>
      
      <div class="app-layout">
        <butter-sidebar id="sidebar"></butter-sidebar>
        <main class="chat-container">
          <butter-chat id="chat"></butter-chat>
        </main>
      </div>
      
      <butter-settings id="settings-panel" class="hidden"></butter-settings>
    `;
  }

  attachEventListeners() {
    // Settings button toggle
    const settingsBtn = this.querySelector('#settings-btn');
    const settingsPanel = this.querySelector('#settings-panel');
    
    if (settingsBtn && settingsPanel) {
      settingsBtn.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
      });
    }

    // Listen for orchestrator selection changes from sidebar
    const sidebar = this.querySelector('#sidebar');
    if (sidebar) {
      sidebar.addEventListener('orchestrator-change', (e) => {
        const orchestratorId = e.detail?.orchestratorId;
        if (orchestratorId) {
          this.updateActiveOrchestrator(orchestratorId);
        }
      });
    }

    // Listen for message send events from chat
    const chat = this.querySelector('#chat');
    if (chat) {
      chat.addEventListener('message-send', (e) => {
        const message = e.detail?.message;
        if (message && this.connector) {
          this.sendChatMessage(message);
        }
      });
    }

    // Listen for settings panel close
    if (settingsPanel) {
      settingsPanel.addEventListener('close', () => {
        settingsPanel.classList.add('hidden');
      });
    }
  }

  _detachEventListeners() {
    // Cleanup handled by DOM removal, but could be explicit here
  }

  updateActiveOrchestrator(orchestratorId) {
    const chat = this.querySelector('#chat');
    if (chat && chat.setOrchestrator) {
      chat.setOrchestrator(orchestratorId);
    }
    
    // Also update in store if available
    if (this.store) {
      this.store.setActiveOrchestrator(orchestratorId);
    }
    
    console.log(`[ButterApp] Active orchestrator changed to: ${orchestratorId}`);
  }

  async sendChatMessage(message) {
    if (!this.connector || !this.connector.connected) {
      console.warn('[ButterApp] Cannot send message: not connected');
      return;
    }

    try {
      // Get active orchestrator from chat or store
      const chat = this.querySelector('#chat');
      const orchestratorId = chat?.getActiveOrchestrator?.() || this.store?.getActiveOrchestrator?.();
      
      await this.connector.send({
        type: 'chat_message',
        payload: {
          message,
          orchestratorId,
          timestamp: Date.now()
        }
      });
      
      console.log('[ButterApp] Message sent:', message);
    } catch (error) {
      console.error('[ButterApp] Failed to send message:', error);
      
      // Notify chat of error
      const chat = this.querySelector('#chat');
      if (chat && chat.showError) {
        chat.showError('Failed to send message. Please try again.');
      }
    }
  }

  _removeConnectorListeners() {
    if (!this.connector) return;
    
    if (this._boundHandlers.connected) {
      this.connector.removeEventListener('connected', this._boundHandlers.connected);
    }
    if (this._boundHandlers.disconnected) {
      this.connector.removeEventListener('disconnected', this._boundHandlers.disconnected);
    }
    
    this._boundHandlers = {
      connected: null,
      disconnected: null
    };
  }

  updateConnectionStatus() {
    const status = this.querySelector('#connection-status');
    if (!status) return;

    if (this.connector && this.connector.connected) {
      status.textContent = 'Connected';
      status.classList.add('connected');
      status.classList.remove('disconnected');
    } else {
      status.textContent = 'Disconnected';
      status.classList.add('disconnected');
      status.classList.remove('connected');
    }
  }

  setConnector(connector) {
    // Remove listeners from previous connector if any
    this._removeConnectorListeners();
    
    this.connector = connector;
    
    // Create bound handlers for proper cleanup
    this._boundHandlers.connected = () => this.updateConnectionStatus();
    this._boundHandlers.disconnected = () => this.updateConnectionStatus();
    
    // Attach event listeners
    this.connector.addEventListener('connected', this._boundHandlers.connected);
    this.connector.addEventListener('disconnected', this._boundHandlers.disconnected);
    
    // Update status if already rendered
    if (this.isConnected) {
      this.updateConnectionStatus();
    }

    // Pass connector to child components
    const sidebar = this.querySelector('#sidebar');
    const chat = this.querySelector('#chat');
    const settings = this.querySelector('#settings-panel');
    
    if (sidebar && sidebar.setConnector) sidebar.setConnector(connector);
    if (chat && chat.setConnector) chat.setConnector(connector);
    if (settings && settings.setConnector) settings.setConnector(connector);
  }

  setStore(store) {
    this.store = store;
    
    // Pass store to child components
    const sidebar = this.querySelector('#sidebar');
    const chat = this.querySelector('#chat');
    const settings = this.querySelector('#settings-panel');
    
    if (sidebar && sidebar.setStore) sidebar.setStore(store);
    if (chat && chat.setStore) chat.setStore(store);
    if (settings && settings.setStore) settings.setStore(store);
  }

  /**
   * Discover orchestrators from OpenClaw Gateway
   * Auto-adds connected agents as orchestrators for magical first-time experience
   */
  async discoverOrchestrators() {
    console.log('🔍 discoverOrchestrators() STARTED');
    const GATEWAY_TOKEN = 'c41df81f4efbf047b6aa0b0cb297536033274be12080dbe1';
    
    try {
      console.log('🔍 Fetching from Gateway via proxy...');
      
      const response = await fetch('http://localhost:8080/gateway-sessions');
      
      if (!response.ok) {
        throw new Error(`Gateway returned ${response.status}`);
      }
      
      const data = await response.json();
      const sessions = data.sessions || [];
      
      // Filter for orchestrator sessions (not subagents)
      // CLI returns sessions with 'key' like 'agent:main:main' or 'agent:main:subagent:xxx'
      const orchestrators = sessions.filter(s => 
        s.key && !s.key.includes('subagent')
      );
      
      if (orchestrators.length === 0) {
        console.log('ℹ️ No orchestrators found in Gateway');
        return;
      }
      
      // Add discovered orchestrators to store
      const existingOrchestrators = this.store.get('orchestrators') || [];
      const existingIds = new Set(existingOrchestrators.map(o => o.id));
      
      let addedCount = 0;
      orchestrators.forEach(orch => {
        // Skip if already exists
        if (existingIds.has(orch.sessionKey)) {
          return;
        }
        
        // Parse key like 'agent:main:main' or 'agent:agentName:sessionId'
        const keyParts = orch.key.split(':');
        const agentName = keyParts[1] || 'Unknown';
        
        const newOrchestrator = {
          id: orch.key,
          name: agentName === 'main' ? 'Chip' : agentName,
          status: 'online',
          avatar: agentName === 'main' ? '🐱‍💻' : '🤖',
          recentActivity: 'Connected via Gateway',
          tokenBurn: orch.totalTokens || 0
        };
        
        existingOrchestrators.push(newOrchestrator);
        addedCount++;
        console.log(`✨ Discovered orchestrator: ${newOrchestrator.name} ${newOrchestrator.avatar}`);
      });
      
      // Update store with all orchestrators
      this.store.set('orchestrators', existingOrchestrators);
      
      // Refresh sidebar to show new orchestrators
      const sidebar = this.querySelector('#sidebar');
      if (sidebar && sidebar.refresh) {
        sidebar.refresh();
        console.log('[Discovery] Sidebar refreshed');
      }
      
      if (addedCount > 0) {
        console.log(`🧈✨ Auto-discovered ${addedCount} orchestrator(s) from Gateway!`);
      } else {
        console.log('ℹ️ All Gateway orchestrators already in store');
      }
      
    } catch (error) {
      console.warn('⚠️ Failed to discover orchestrators:', error.message);
      // Non-fatal - app continues to work without auto-discovery
    }
  }
}

// Register the custom element
customElements.define('butter-app', ButterApp);

/**
 * Initialize the application
 */
async function init() {
  const appContainer = document.getElementById('app');

  try {
    // Create store
    const store = new ButterStore();
    window.butterStore = store; // Expose for debugging

    // Create connector
    const connector = new ButterConnector();
    window.butterConnector = connector; // Expose for debugging

    // Create and mount app component
    const app = document.createElement('butter-app');
    
    // Clear loading state and mount first
    appContainer.innerHTML = '';
    appContainer.appendChild(app);
    
    // Then set dependencies (components are now in DOM)
    app.setConnector(connector);
    app.setStore(store);

    // Attempt connection
    await connector.connect().catch(err => {
      console.warn('Initial connection failed, will retry:', err);
    });

    // Discover orchestrators from Gateway for magical auto-setup
    console.log('🔍 About to discover orchestrators...');
    if (app.discoverOrchestrators) {
      try {
        await app.discoverOrchestrators();
      } catch (e) {
        console.error('Discovery failed:', e);
      }
    } else {
      console.warn('discoverOrchestrators method not found');
    }

    console.log('🧈 OpenButter initialized successfully');

  } catch (error) {
    console.error('Failed to initialize OpenButter:', error);
    renderError(error, appContainer);
  }
}

// Global error handling
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error });
  const appContainer = document.getElementById('app');
  if (appContainer) {
    renderError(error || new Error(String(message)), appContainer);
  }
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  const appContainer = document.getElementById('app');
  if (appContainer) {
    renderError(event.reason || new Error('Unhandled promise rejection'), appContainer);
  }
};

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
