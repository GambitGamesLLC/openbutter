/**
 * Debug Logger - Captures console logs and displays them in a DOM overlay
 * 
 * Features:
 * - Captures console.log, console.error, console.warn, console.info
 * - Floating panel with auto-scroll
 * - Toggle with Ctrl+~ or button
 * - Clear logs button
 * - Preserves original console behavior
 */

class DebugLogger {
  constructor(options = {}) {
    this.maxLogs = options.maxLogs || 500;
    this.logs = [];
    this.isVisible = false;
    this.originalConsole = {};
    this.container = null;
    this.logContainer = null;
    this.toggleKey = options.toggleKey || 'd';
    this.toggleKeyCtrl = options.toggleKeyCtrl !== false;
    
    // CSS Classes for log levels
    this.levelClasses = {
      log: 'debug-log-level-log',
      info: 'debug-log-level-info',
      warn: 'debug-log-level-warn',
      error: 'debug-log-level-error',
      debug: 'debug-log-level-debug'
    };
  }

  /**
   * Initialize the debug logger
   */
  init() {
    if (this.container) return this; // Already initialized
    
    this._captureConsole();
    this._createDOM();
    this._attachKeyboardListener();
    
    console.log('🔧 Debug Logger initialized (Press Ctrl+D to toggle)');
    
    return this;
  }

  /**
   * Capture original console methods
   */
  _captureConsole() {
    const methods = ['log', 'info', 'warn', 'error', 'debug'];
    
    methods.forEach(method => {
      this.originalConsole[method] = console[method];
      
      console[method] = (...args) => {
        // Call original
        this.originalConsole[method].apply(console, args);
        
        // Capture for our logger
        this._addLog(method, args);
      };
    });
  }

  /**
   * Restore original console methods
   */
  destroy() {
    // Restore console
    Object.keys(this.originalConsole).forEach(method => {
      console[method] = this.originalConsole[method];
    });
    
    // Remove DOM
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    
    // Remove keyboard listener
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
  }

  /**
   * Create the debug panel DOM
   */
  _createDOM() {
    // Container
    this.container = document.createElement('div');
    this.container.id = 'debug-logger-panel';
    this.container.className = 'debug-logger-panel';
    this.container.style.display = 'none';
    
    // Header
    const header = document.createElement('div');
    header.className = 'debug-logger-header';
    header.innerHTML = `
      <span class="debug-logger-title">🔧 Console Logs</span>
      <div class="debug-logger-actions">
        <button class="debug-logger-btn debug-logger-clear" title="Clear logs">🗑️ Clear</button>
        <button class="debug-logger-btn debug-logger-close" title="Close (Ctrl+D)">✕</button>
      </div>
    `;
    
    // Log container
    this.logContainer = document.createElement('div');
    this.logContainer.className = 'debug-logger-logs';
    
    // Toggle button (floating)
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'debug-logger-toggle';
    toggleBtn.className = 'debug-logger-toggle';
    toggleBtn.innerHTML = '📋';
    toggleBtn.title = 'Toggle Debug Console (Ctrl+D)';
    
    // Assemble
    this.container.appendChild(header);
    this.container.appendChild(this.logContainer);
    
    // Add to document
    document.body.appendChild(this.container);
    document.body.appendChild(toggleBtn);
    
    // Event listeners
    header.querySelector('.debug-logger-clear').addEventListener('click', () => this.clear());
    header.querySelector('.debug-logger-close').addEventListener('click', () => this.hide());
    toggleBtn.addEventListener('click', () => this.toggle());
    
    // Inject styles
    this._injectStyles();
  }

  /**
   * Inject CSS styles
   */
  _injectStyles() {
    if (document.getElementById('debug-logger-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'debug-logger-styles';
    styles.textContent = `
      .debug-logger-panel {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 600px;
        max-width: calc(100vw - 40px);
        height: 400px;
        max-height: calc(100vh - 40px);
        background: rgba(30, 30, 30, 0.95);
        border: 1px solid #444;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 12px;
        z-index: 10000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
      }
      
      .debug-logger-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: rgba(50, 50, 50, 0.9);
        border-bottom: 1px solid #444;
        border-radius: 8px 8px 0 0;
        flex-shrink: 0;
      }
      
      .debug-logger-title {
        color: #fff;
        font-weight: 600;
        font-size: 13px;
      }
      
      .debug-logger-actions {
        display: flex;
        gap: 8px;
      }
      
      .debug-logger-btn {
        background: #444;
        color: #fff;
        border: none;
        padding: 4px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 11px;
        transition: background 0.2s;
      }
      
      .debug-logger-btn:hover {
        background: #555;
      }
      
      .debug-logger-clear:hover {
        background: #c0392b;
      }
      
      .debug-logger-close:hover {
        background: #e74c3c;
      }
      
      .debug-logger-logs {
        flex: 1;
        overflow-y: auto;
        padding: 8px;
        color: #ddd;
      }
      
      .debug-log-entry {
        padding: 4px 8px;
        margin-bottom: 2px;
        border-radius: 3px;
        word-break: break-word;
        white-space: pre-wrap;
        line-height: 1.4;
      }
      
      .debug-log-entry:hover {
        background: rgba(255, 255, 255, 0.05);
      }
      
      .debug-log-timestamp {
        color: #888;
        margin-right: 8px;
        font-size: 10px;
      }
      
      .debug-log-level-log { color: #ddd; }
      .debug-log-level-info { color: #3498db; }
      .debug-log-level-warn { color: #f39c12; background: rgba(243, 156, 18, 0.1); }
      .debug-log-level-error { color: #e74c3c; background: rgba(231, 76, 60, 0.1); }
      .debug-log-level-debug { color: #9b59b6; }
      
      .debug-logger-toggle {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        background: #3498db;
        color: white;
        border: none;
        font-size: 20px;
        cursor: pointer;
        z-index: 9999;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
        transition: transform 0.2s, background 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .debug-logger-toggle:hover {
        transform: scale(1.1);
        background: #2980b9;
      }
      
      .debug-logger-toggle.active {
        background: #e74c3c;
      }
      
      /* Scrollbar styling */
      .debug-logger-logs::-webkit-scrollbar {
        width: 8px;
      }
      
      .debug-logger-logs::-webkit-scrollbar-track {
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }
      
      .debug-logger-logs::-webkit-scrollbar-thumb {
        background: #555;
        border-radius: 4px;
      }
      
      .debug-logger-logs::-webkit-scrollbar-thumb:hover {
        background: #666;
      }
      
      /* Object formatting */
      .debug-log-object {
        color: #2ecc71;
      }
      
      /* Responsive */
      @media (max-width: 640px) {
        .debug-logger-panel {
          left: 10px;
          right: 10px;
          bottom: 70px;
          width: auto;
          max-width: none;
        }
        
        .debug-logger-toggle {
          bottom: 10px;
          right: 10px;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }

  /**
   * Attach keyboard listener for toggle
   */
  _attachKeyboardListener() {
    this._keyHandler = (e) => {
      const isToggleKey = e.key === this.toggleKey || e.code === 'Backquote';
      const isCtrl = this.toggleKeyCtrl ? e.ctrlKey : true;
      
      if (isToggleKey && isCtrl) {
        e.preventDefault();
        this.toggle();
      }
    };
    
    document.addEventListener('keydown', this._keyHandler);
  }

  /**
   * Add a log entry
   */
  _addLog(level, args) {
    const timestamp = new Date().toLocaleTimeString();
    const message = args.map(arg => this._formatArg(arg)).join(' ');
    
    const logEntry = {
      timestamp,
      level,
      message,
      raw: args
    };
    
    this.logs.push(logEntry);
    
    // Trim if too many
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
    
    // Render if visible
    if (this.isVisible) {
      this._renderLogEntry(logEntry);
    }
  }

  /**
   * Format an argument for display
   */
  _formatArg(arg) {
    if (arg === null) return 'null';
    if (arg === undefined) return 'undefined';
    if (typeof arg === 'object') {
      try {
        return JSON.stringify(arg, null, 2);
      } catch (e) {
        return '[Circular Object]';
      }
    }
    if (typeof arg === 'string') return arg;
    return String(arg);
  }

  /**
   * Render a single log entry
   */
  _renderLogEntry(entry) {
    if (!this.logContainer) return;
    
    const div = document.createElement('div');
    div.className = `debug-log-entry ${this.levelClasses[entry.level] || 'debug-log-level-log'}`;
    div.innerHTML = `
      <span class="debug-log-timestamp">${entry.timestamp}</span>
      <span class="debug-log-message">${this._escapeHtml(entry.message)}</span>
    `;
    
    this.logContainer.appendChild(div);
    
    // Auto-scroll to bottom
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
  }

  /**
   * Escape HTML special characters
   */
  _escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Render all logs (used when showing panel)
   */
  _renderAllLogs() {
    if (!this.logContainer) return;
    
    this.logContainer.innerHTML = '';
    this.logs.forEach(entry => this._renderLogEntry(entry));
  }

  /**
   * Show the debug panel
   */
  show() {
    if (!this.container) this.init();
    
    this.isVisible = true;
    this.container.style.display = 'flex';
    
    const toggleBtn = document.getElementById('debug-logger-toggle');
    if (toggleBtn) toggleBtn.classList.add('active');
    
    // Render all existing logs
    this._renderAllLogs();
  }

  /**
   * Hide the debug panel
   */
  hide() {
    this.isVisible = false;
    if (this.container) {
      this.container.style.display = 'none';
    }
    
    const toggleBtn = document.getElementById('debug-logger-toggle');
    if (toggleBtn) toggleBtn.classList.remove('active');
  }

  /**
   * Toggle visibility
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
  }

  /**
   * Clear all logs
   */
  clear() {
    this.logs = [];
    if (this.logContainer) {
      this.logContainer.innerHTML = '';
    }
    console.log('🗑️ Debug logs cleared');
  }

  /**
   * Get all logs (for export/debugging)
   */
  getLogs() {
    return [...this.logs];
  }

  /**
   * Export logs as JSON
   */
  export() {
    const data = JSON.stringify(this.logs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `debug-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
const debugLogger = new DebugLogger();

// Export for module use
export { DebugLogger, debugLogger };

// Auto-init if in browser
if (typeof window !== 'undefined') {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => debugLogger.init());
  } else {
    debugLogger.init();
  }
  
  // Expose to window for console access
  window.debugLogger = debugLogger;
}
