/**
 * AutoLogger - Automatic Browser Log Capture
 * 
 * Captures console output and sends it to a local HTTP server
 * for persistence. Used for debugging browser-side issues.
 */

class AutoLogger {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || 'http://localhost:8080/logs';
    this.batchSize = options.batchSize || 10;
    this.flushInterval = options.flushInterval || 1000; // ms
    this.buffer = [];
    this.isInitialized = false;
    this.flushTimer = null;
    this.serverAvailable = true; // Start optimistic
    this.consecutiveFailures = 0;
    this.maxFailures = 100; // Increased - keep trying, server may start later
  }

  /**
   * Initialize the auto-logger and patch console methods
   */
  init() {
    if (this.isInitialized) return;
    if (typeof window === 'undefined') return; // Skip in Node.js

    this.patchConsole();
    this.startFlushTimer();
    this.captureGlobalErrors();
    
    this.isInitialized = true;
    
    // Log initialization - use original console to avoid recursion
    console._originalLog?.('📋 AutoLogger active - logs sent to server');
    
    // Queue initialization log
    this.queueLog('info', 'AutoLogger initialized', {
      url: window.location.href,
      userAgent: navigator.userAgent
    });
  }

  /**
   * Patch console methods to capture output
   */
  patchConsole() {
    // Store original methods if not already stored
    if (!console._originalLog) {
      console._originalLog = console.log;
      console._originalInfo = console.info;
      console._originalWarn = console.warn;
      console._originalError = console.error;
      console._originalDebug = console.debug;
    }
    
    const originalConsole = {
      log: console._originalLog,
      info: console._originalInfo,
      warn: console._originalWarn,
      error: console._originalError,
      debug: console._originalDebug
    };

    const self = this;

    // Helper to create patched method
    const createPatched = (level, original) => {
      return function(...args) {
        // Call original first
        original.apply(console, args);
        
        // Queue the log
        const message = args.map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg);
            } catch (e) {
              return String(arg);
            }
          }
          return String(arg);
        }).join(' ');
        
        self.queueLog(level, message, { rawArgs: args.length });
      };
    };

    console.log = createPatched('log', originalConsole.log);
    console.info = createPatched('info', originalConsole.info);
    console.warn = createPatched('warn', originalConsole.warn);
    console.error = createPatched('error', originalConsole.error);
    console.debug = createPatched('debug', originalConsole.debug);

    // Store originals for potential restore
    this._originalConsole = originalConsole;
  }

  /**
   * Restore original console methods
   */
  restore() {
    if (!this._originalConsole) return;
    
    console.log = this._originalConsole.log;
    console.info = this._originalConsole.info;
    console.warn = this._originalConsole.warn;
    console.error = this._originalConsole.error;
    console.debug = this._originalConsole.debug;
    
    this.stopFlushTimer();
    this.isInitialized = false;
  }

  /**
   * Capture global errors
   */
  captureGlobalErrors() {
    // Capture JS errors
    window.addEventListener('error', (event) => {
      this.queueLog('error', `Global error: ${event.message}`, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack || 'No stack trace'
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      this.queueLog('error', `Unhandled promise rejection: ${reason?.message || reason}`, {
        stack: reason?.stack || 'No stack trace'
      });
    });
  }

  /**
   * Queue a log entry for batching
   */
  queueLog(level, message, extra = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      url: window.location.href,
      ...extra
    };

    this.buffer.push(logEntry);

    // Flush immediately if buffer is full
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  /**
   * Start the flush timer for batching
   */
  startFlushTimer() {
    this.flushTimer = setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.flushInterval);
  }

  /**
   * Stop the flush timer
   */
  stopFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  /**
   * Flush the buffer to the server
   */
  async flush() {
    if (this.buffer.length === 0) return;
    if (!this.serverAvailable && this.consecutiveFailures >= this.maxFailures) {
      // Server seems down, clear buffer to prevent memory growth
      this.buffer = [];
      return;
    }

    const logsToSend = [...this.buffer];
    this.buffer = [];

    // Send each log individually (simpler server implementation)
    const sendPromises = logsToSend.map(log => this.sendLog(log));
    
    try {
      await Promise.all(sendPromises);
      if (this.consecutiveFailures > 0) {
        this.consecutiveFailures = 0;
        this.serverAvailable = true;
      }
    } catch (error) {
      // Individual failures handled in sendLog
    }
  }

  /**
   * Send a single log entry to the server
   */
  async sendLog(logEntry) {
    try {
      const response = await fetch(this.serverUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(logEntry)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      this.consecutiveFailures++;
      
      if (this.consecutiveFailures >= this.maxFailures) {
        this.serverAvailable = false;
        // Silently fail - don't spam console with connection errors
      }
      
      return false;
    }
  }
}

// Create singleton instance
export const autoLogger = new AutoLogger();

// Auto-initialize if in browser
if (typeof window !== 'undefined') {
  autoLogger.init();
}
