/**
 * OpenButter - Main Entry Point
 *
 * Initializes the application, registers web components,
 * and mounts the app to the DOM.
 */

import { ButterStore } from './services/butter-store.js';
import { ButterConnector } from './services/butter-connector-browser.js';

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
 * Main app component placeholder
 * Will be replaced with actual butter-app component once defined
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
    this.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <h1>🧈 OpenButter</h1>
        <p>App initialized successfully!</p>
        <p style="color: var(--text-secondary); margin-top: 1rem;">
          Connection: <span id="connection-status">Connecting...</span>
        </p>
      </div>
    `;
    
    this.updateConnectionStatus();
  }

  disconnectedCallback() {
    this._removeConnectorListeners();
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
    const status = document.getElementById('connection-status');
    if (!status || !this.connector) return;

    status.textContent = this.connector.connected ? 'Connected ✅' : 'Disconnected ❌';
    status.style.color = this.connector.connected ? 'var(--success)' : 'var(--error)';
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
    this.updateConnectionStatus();
  }

  setStore(store) {
    this.store = store;
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
    app.setConnector(connector);
    app.setStore(store);

    // Clear loading state and mount
    appContainer.innerHTML = '';
    appContainer.appendChild(app);

    // Attempt connection
    await connector.connect().catch(err => {
      console.warn('Initial connection failed, will retry:', err);
    });

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
