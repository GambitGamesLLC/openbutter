/**
 * OpenButter - Main Entry Point
 * 
 * Initializes the application, registers web components,
 * and mounts the app to the DOM.
 */

// App version for debugging
const APP_VERSION = '0.1.0';

console.log(`🧈 OpenButter v${APP_VERSION} starting...`);

/**
 * ButterConnector - Manages WebSocket connection to OpenButter backend
 */
class ButterConnector extends EventTarget {
  constructor(url = null) {
    super();
    this.url = url || this._getDefaultUrl();
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
  }
  
  _getDefaultUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/ws`;
  }
  
  async connect() {
    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('🔌 Connected to OpenButter');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.dispatchEvent(new CustomEvent('connected'));
      };
      
      this.ws.onclose = () => {
        console.log('🔌 Disconnected from OpenButter');
        this.connected = false;
        this.dispatchEvent(new CustomEvent('disconnected'));
        this._attemptReconnect();
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.dispatchEvent(new CustomEvent('error', { detail: error }));
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.dispatchEvent(new CustomEvent('message', { detail: data }));
        } catch (e) {
          console.warn('Received non-JSON message:', event.data);
        }
      };
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }
  
  _attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.dispatchEvent(new CustomEvent('reconnect_failed'));
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => this.connect(), delay);
  }
  
  send(data) {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected');
    }
    this.ws.send(JSON.stringify(data));
  }
  
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * ButterStore - Central state management
 */
class ButterStore extends EventTarget {
  constructor() {
    super();
    this.state = new Proxy({}, {
      set: (target, key, value) => {
        const oldValue = target[key];
        target[key] = value;
        
        if (oldValue !== value) {
          this.dispatchEvent(new CustomEvent('change', {
            detail: { key, value, oldValue }
          }));
          this.dispatchEvent(new CustomEvent(`change:${key}`, {
            detail: { value, oldValue }
          }));
        }
        
        return true;
      }
    });
    
    this.subscribers = new Map();
  }
  
  get(key, defaultValue = undefined) {
    return this.state[key] ?? defaultValue;
  }
  
  set(key, value) {
    this.state[key] = value;
  }
  
  update(key, updater) {
    const current = this.get(key);
    this.set(key, updater(current));
  }
  
  subscribe(key, callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    
    const handler = (e) => callback(e.detail.value, e.detail.oldValue);
    this.subscribers.get(key).add(handler);
    this.addEventListener(`change:${key}`, handler);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(key).delete(handler);
      this.removeEventListener(`change:${key}`, handler);
    };
  }
}

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
  
  updateConnectionStatus() {
    const status = document.getElementById('connection-status');
    if (!status || !this.connector) return;
    
    status.textContent = this.connector.connected ? 'Connected ✅' : 'Disconnected ❌';
    status.style.color = this.connector.connected ? 'var(--success)' : 'var(--error)';
  }
  
  setConnector(connector) {
    this.connector = connector;
    this.connector.addEventListener('connected', () => this.updateConnectionStatus());
    this.connector.addEventListener('disconnected', () => this.updateConnectionStatus());
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
