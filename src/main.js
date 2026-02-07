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
          background: var(--bg-primary, #0f172a);
          color: var(--text-primary, #f8fafc);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        }

        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 1.25rem;
          background: var(--bg-secondary, #1e293b);
          border-bottom: 1px solid var(--border-color, #334155);
          flex-shrink: 0;
          height: 56px;
          box-sizing: border-box;
        }

        .app-header h1 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary, #f8fafc);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        #settings-btn {
          background: var(--bg-tertiary, #334155);
          border: 1px solid var(--border-color, #475569);
          color: var(--text-primary, #f8fafc);
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
          background: var(--bg-hover, #475569);
          border-color: var(--border-hover, #64748b);
        }

        #settings-btn:active {
          background: var(--bg-active, #334155);
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
          border-right: 1px solid var(--border-color, #334155);
          background: var(--bg-secondary, #1e293b);
          overflow-y: auto;
        }

        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--bg-primary, #0f172a);
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
          background: var(--bg-secondary, #1e293b);
          border-left: 1px solid var(--border-color, #334155);
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
          background: var(--bg-secondary, #1e293b);
        }

        ::-webkit-scrollbar-thumb {
          background: var(--border-color, #334155);
          border-radius: 4px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: var(--border-hover, #475569);
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
          background: var(--bg-primary, #0f172a);
          color: var(--text-primary, #f8fafc);
        }

        .error-boundary h1 {
          color: var(--error, #ef4444);
          margin-bottom: 1rem;
        }

        .error-boundary button {
          margin-top: 1.5rem;
          padding: 0.75rem 1.5rem;
          background: var(--accent, #6366f1);
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
        }

        .error-boundary button:hover {
          background: var(--accent-hover, #4f46e5);
        }
      </style>

      <header class="app-header">
        <h1>🧈 OpenButter</h1>
        <div class="header-actions">
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

  setConnector(connector) {
    // Remove listeners from previous connector if any
    this._removeConnectorListeners();
    
    this.connector = connector;

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
      
      // Filter for ONLY the main agent session
      // Only include: 'agent:main:main' (not subagents, not discord integrations)
      const orchestrators = sessions.filter(s => s.key === 'agent:main:main');
      
      if (orchestrators.length === 0) {
        console.log('ℹ️ No orchestrators found in Gateway');
        return;
      }
      
      // Add discovered orchestrators to store
      let existingOrchestrators = this.store.get('orchestrators') || [];
      console.log('[Discovery] Existing orchestrators from store:', existingOrchestrators.map(o => ({ id: o.id, name: o.name, tokenBurn: o.tokenBurn })));
      
      // Deduplicate existing orchestrators (auto-fix any previous duplicates)
      const seenIds = new Set();
      existingOrchestrators = existingOrchestrators.filter(o => {
        if (seenIds.has(o.id)) {
          console.log(`[Discovery] Removing duplicate from store: ${o.id}`);
          return false;
        }
        seenIds.add(o.id);
        return true;
      });
      
      const existingIds = new Set(existingOrchestrators.map(o => o.id));
      console.log('[Discovery] Existing IDs set:', [...existingIds]);
      
      let addedCount = 0;
      let updatedCount = 0;
      orchestrators.forEach(orch => {
        // Use key as unique ID (CLI returns 'key' not 'sessionKey')
        const orchId = orch.key;
        console.log(`[Discovery] Checking orchestrator from Gateway: key=${orch.key}, sessionKey=${orch.sessionKey}, tokens=${orch.totalTokens}`);
        
        // Check if already exists (check both old and new id formats for compatibility)
        const existingIndex = existingOrchestrators.findIndex(o => 
          o.id === orchId || o.id === orch.sessionKey
        );
        
        if (existingIndex !== -1) {
          // Update existing orchestrator with fresh data from Gateway
          // Create a new object to ensure reactivity
          const existing = existingOrchestrators[existingIndex];
          console.log(`[Discovery] Updating existing ${orchId}: tokens ${existing.tokenBurn} -> ${orch.totalTokens || 0}`);
          existingOrchestrators[existingIndex] = {
            ...existing,
            tokenBurn: orch.totalTokens || 0,
            status: 'online',
            recentActivity: 'Connected via Gateway'
          };
          updatedCount++;
          return;
        }
        
        // Parse key like 'agent:main:main' or 'agent:agentName:sessionId'
        const keyParts = orch.key.split(':');
        const agentName = keyParts[1] || 'Unknown';
        
        const newOrchestrator = {
          id: orchId,
          name: agentName === 'main' ? 'Chip' : agentName,
          status: 'online',
          avatar: agentName === 'main' ? '🐱‍💻' : '🤖',
          recentActivity: 'Connected via Gateway',
          tokenBurn: orch.totalTokens || 0
        };
        
        existingOrchestrators.push(newOrchestrator);
        existingIds.add(orchId); // Track this ID to prevent duplicates in same run
        addedCount++;
        console.log(`✨ Discovered orchestrator: ${newOrchestrator.name} ${newOrchestrator.avatar}`);
      });
      
      // Update store with all orchestrators
      this.store.set('orchestrators', existingOrchestrators);
      console.log('[Discovery] Store updated with orchestrators:', existingOrchestrators.map(o => ({ id: o.id, name: o.name, tokenBurn: o.tokenBurn })));
      
      // Force sidebar refresh to show updates
      const sidebar = this.querySelector('#sidebar');
      if (sidebar) {
        if (sidebar.refresh) {
          sidebar.refresh();
          console.log('[Discovery] Sidebar refreshed via refresh()');
        } else {
          // Fallback: trigger a custom event that sidebar can listen for
          console.log('[Discovery] Sidebar refresh method not found, store update should trigger re-render');
        }
      }
      
      if (addedCount > 0) {
        console.log(`🧈✨ Auto-discovered ${addedCount} orchestrator(s) from Gateway!`);
      } else if (updatedCount > 0) {
        console.log(`🧈✨ Updated ${updatedCount} existing orchestrator(s) from Gateway!`);
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
    // Clear any duplicate orchestrators from localStorage before creating store
    // This prevents stale data from previous versions
    try {
      const stored = localStorage.getItem('butter-store');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.orchestrators) {
          console.log('[Init] Raw orchestrators from localStorage:', parsed.orchestrators.map(o => ({ id: o.id, name: o.name, tokenBurn: o.tokenBurn })));
          
          // First pass: remove exact ID duplicates and non-main orchestrators
          const unique = [];
          const seen = new Set();
          for (const o of parsed.orchestrators) {
            // Skip Discord integrations and subagents
            if (o.id && (o.id.includes('discord') || o.id.includes('subagent'))) {
              console.log(`[Init] Removing non-main orchestrator: ${o.id}`);
              continue;
            }
            if (!seen.has(o.id)) {
              seen.add(o.id);
              unique.push(o);
            } else {
              console.log(`[Init] Removing duplicate orchestrator with ID: ${o.id}`);
            }
          }
          
          // Second pass: ensure only one 'agent:main:main' orchestrator exists
          // Only match by exact ID, not by name (to avoid matching Discord integrations)
          const chipOrchestrators = unique.filter(o => 
            o.id === 'agent:main:main'
          );
          
          if (chipOrchestrators.length > 1) {
            console.log(`[Init] Found ${chipOrchestrators.length} Chip orchestrators, cleaning up...`);
            // Keep only the one with correct ID 'agent:main:main', or the first one if none match
            const correctChip = unique.find(o => o.id === 'agent:main:main') || chipOrchestrators[0];
            console.log(`[Init] Keeping Chip with ID: ${correctChip.id}, tokenBurn: ${correctChip.tokenBurn}`);
            
            // Remove all Chip orchestrators from unique (only match by ID, not name)
            const cleaned = unique.filter(o => 
              !(o.id === 'agent:main:main')
            );
            // Add back the correct one
            cleaned.push(correctChip);
            
            console.log(`[Init] Removed ${unique.length - cleaned.length} duplicate Chip orchestrators`);
            parsed.orchestrators = cleaned;
            localStorage.setItem('butter-store', JSON.stringify(parsed));
          } else if (unique.length !== parsed.orchestrators.length) {
            console.log(`[Init] Cleaning ${parsed.orchestrators.length - unique.length} duplicate orchestrators from localStorage`);
            parsed.orchestrators = unique;
            localStorage.setItem('butter-store', JSON.stringify(parsed));
          }
        }
      }
    } catch (e) {
      console.warn('[Init] Failed to clean localStorage:', e);
    }

    // Create store (will load cleaned data)
    const store = new ButterStore();
    window.butterStore = store;

    // Check for token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    // Create connector
    const connector = new ButterConnector(null, token);
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
