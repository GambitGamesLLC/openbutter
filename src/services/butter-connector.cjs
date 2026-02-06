/**
 * @fileoverview ButterConnector WebSocket service for OpenClaw Gateway communication
 * @module services/butter-connector
 */

const WebSocket = require('ws');
const { EventEmitter } = require('events');

/**
 * Configuration options for ButterConnector
 * @typedef {Object} ButterConnectorOptions
 * @property {string} [url='ws://localhost:18789'] - WebSocket server URL
 * @property {number} [reconnectInterval=1000] - Initial reconnection interval in ms
 * @property {number} [maxReconnectInterval=30000] - Maximum reconnection interval in ms
 * @property {number} [reconnectDecay=2] - Exponential backoff multiplier
 * @property {number} [heartbeatInterval=30000] - Heartbeat interval in ms
 * @property {number} [connectionTimeout=10000] - Connection timeout in ms
 */

/**
 * JSON-RPC request structure
 * @typedef {Object} JsonRpcRequest
 * @property {string} jsonrpc - JSON-RPC version (always "2.0")
 * @property {string} method - Method name to call
 * @property {*} [params] - Method parameters
 * @property {number|string} id - Request identifier
 */

/**
 * JSON-RPC response structure
 * @typedef {Object} JsonRpcResponse
 * @property {string} jsonrpc - JSON-RPC version (always "2.0")
 * @property {*} [result] - Result data (if success)
 * @property {Object} [error] - Error object (if error)
 * @property {number} error.code - Error code
 * @property {string} error.message - Error message
 * @property {number|string} id - Request identifier
 */

/**
 * WebSocket connector for OpenClaw Gateway communication with automatic reconnection,
 * heartbeat, message queuing, and JSON-RPC support.
 * @extends EventEmitter
 */
class ButterConnector extends EventEmitter {
  /**
   * Default configuration options
   * @type {ButterConnectorOptions}
   * @static
   */
  static defaultOptions = {
    url: 'ws://localhost:18789',
    reconnectInterval: 1000,
    maxReconnectInterval: 30000,
    reconnectDecay: 2,
    heartbeatInterval: 30000,
    connectionTimeout: 10000
  };

  /**
   * Creates an instance of ButterConnector
   * @param {ButterConnectorOptions} [options={}] - Configuration options
   */
  constructor(options = {}) {
    super();
    
    /** @type {ButterConnectorOptions} */
    this.options = { ...ButterConnector.defaultOptions, ...options };
    
    /** @type {WebSocket|null} */
    this.ws = null;
    
    /** @type {boolean} */
    this._connected = false;
    
    /** @type {boolean} */
    this._shouldReconnect = true;
    
    /** @type {number} */
    this.reconnectAttempts = 0;
    
    /** @type {number|null} */
    this.reconnectTimer = null;
    
    /** @type {number|null} */
    this.heartbeatTimer = null;
    
    /** @type {number|null} */
    this.connectionTimer = null;
    
    /** @type {Array<{method: string, params: *, callback?: Function}>} */
    this.messageQueue = [];
    
    /** @type {number} */
    this.messageId = 0;
    
    /** @type {Map<number, Function>} */
    this.pendingRequests = new Map();
    
    /** @type {number} */
    this.currentReconnectInterval = this.options.reconnectInterval;
  }

  /**
   * Establishes WebSocket connection to the gateway
   * @returns {void}
   */
  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this._shouldReconnect = true;

    try {
      this.ws = new WebSocket(this.options.url);
      
      this.connectionTimer = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.ws?.terminate();
          this._handleError(new Error('Connection timeout'));
        }
      }, this.options.connectionTimeout);

      this.ws.on('open', () => this._handleOpen());
      this.ws.on('message', (data) => this._handleMessage(data));
      this.ws.on('close', (code, reason) => this._handleClose(code, reason));
      this.ws.on('error', (error) => this._handleError(error));
      this.ws.on('pong', () => this._handlePong());
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Handles WebSocket connection open event
   * @private
   * @returns {void}
   */
  _handleOpen() {
    this._connected = true;
    this.reconnectAttempts = 0;
    this.currentReconnectInterval = this.options.reconnectInterval;
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }

    // Flush queued messages
    this._flushQueue();
    
    // Start heartbeat
    this._startHeartbeat();
    
    this.emit('connected');
  }

  /**
   * Handles incoming WebSocket messages
   * @private
   * @param {Buffer|string} data - Raw message data
   * @returns {void}
   */
  _handleMessage(data) {
    try {
      /** @type {JsonRpcResponse} */
      const message = JSON.parse(data.toString());
      
      // Handle JSON-RPC response
      if (message.id !== undefined && this.pendingRequests.has(message.id)) {
        const callback = this.pendingRequests.get(message.id);
        this.pendingRequests.delete(message.id);
        
        if (callback) {
          callback(message);
        }
      }
      
      this.emit('message', message);
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error.message}`));
    }
  }

  /**
   * Handles WebSocket connection close event
   * @private
   * @param {number} code - Close code
   * @param {Buffer} reason - Close reason
   * @returns {void}
   */
  _handleClose(code, reason) {
    this._connected = false;
    this._stopHeartbeat();
    this.emit('disconnected', { code, reason: reason?.toString() });

    if (this._shouldReconnect) {
      this._scheduleReconnect();
    }
  }

  /**
   * Handles WebSocket errors
   * @private
   * @param {Error} error - Error object
   * @returns {void}
   */
  _handleError(error) {
    this.emit('error', error);
    
    if (!this._connected && this._shouldReconnect) {
      this._scheduleReconnect();
    }
  }

  /**
   * Handles WebSocket pong response
   * @private
   * @returns {void}
   */
  _handlePong() {
    this.emit('heartbeat');
  }

  /**
   * Schedules reconnection with exponential backoff
   * @private
   * @returns {void}
   */
  _scheduleReconnect() {
    if (this.reconnectTimer) {
      return;
    }

    this.reconnectAttempts++;
    
    // Calculate exponential backoff
    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(this.options.reconnectDecay, this.reconnectAttempts - 1),
      this.options.maxReconnectInterval
    );
    
    this.currentReconnectInterval = delay;
    
    this.emit('reconnecting', { 
      attempt: this.reconnectAttempts, 
      delay,
      url: this.options.url 
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }

  /**
   * Starts heartbeat interval
   * @private
   * @returns {void}
   */
  _startHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, this.options.heartbeatInterval);
  }

  /**
   * Stops heartbeat interval
   * @private
   * @returns {void}
   */
  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Flushes queued messages
   * @private
   * @returns {void}
   */
  _flushQueue() {
    while (this.messageQueue.length > 0 && this._connected) {
      const { method, params, callback } = this.messageQueue.shift();
      this._sendInternal(method, params, callback);
    }
  }

  /**
   * Internal send method (bypasses queue)
   * @private
   * @param {string} method - JSON-RPC method name
   * @param {*} params - Method parameters
   * @param {Function} [callback] - Optional callback for response
   * @returns {boolean}
   */
  _sendInternal(method, params, callback) {
    if (this.ws?.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const request = this.createRequest(method, params);
      
      if (callback) {
        this.pendingRequests.set(request.id, callback);
      }
      
      this.ws.send(JSON.stringify(request));
      return true;
    } catch (error) {
      this.emit('error', new Error(`Failed to send message: ${error.message}`));
      return false;
    }
  }

  /**
   * Generates a unique message ID
   * @returns {number}
   */
  generateId() {
    return ++this.messageId;
  }

  /**
   * Creates a JSON-RPC request object
   * @param {string} method - Method name
   * @param {*} [params] - Method parameters
   * @returns {JsonRpcRequest}
   */
  createRequest(method, params) {
    return {
      jsonrpc: '2.0',
      method,
      params,
      id: this.generateId()
    };
  }

  /**
   * Sends a message to the gateway (queues if disconnected)
   * @param {string} method - JSON-RPC method name
   * @param {*} [params] - Method parameters
   * @param {Function} [callback] - Optional callback for response
   * @returns {boolean} - True if sent immediately, false if queued
   */
  send(method, params, callback) {
    if (this._connected) {
      return this._sendInternal(method, params, callback);
    } else {
      this.messageQueue.push({ method, params, callback });
      return false;
    }
  }

  /**
   * Gets the current number of queued messages
   * @returns {number}
   */
  getQueueLength() {
    return this.messageQueue.length;
  }

  /**
   * Gets the current reconnect interval
   * @returns {number}
   */
  getCurrentReconnectInterval() {
    return this.currentReconnectInterval;
  }

  /**
   * Checks if currently connected
   * @returns {boolean}
   */
  isConnected() {
    return this._connected && this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Disconnects from the gateway and stops reconnection
   * @returns {void}
   */
  disconnect() {
    this._shouldReconnect = false;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.connectionTimer) {
      clearTimeout(this.connectionTimer);
      this.connectionTimer = null;
    }
    
    this._stopHeartbeat();
    
    if (this.ws) {
      try {
        this.ws.close();
      } catch (error) {
        // Ignore close errors
      }
      this.ws = null;
    }
    
    this._connected = false;
  }

  /**
   * Adds an event listener (convenience method for EventTarget compatibility)
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   * @returns {ButterConnector}
   */
  addEventListener(event, listener) {
    this.on(event, listener);
    return this;
  }

  /**
   * Removes an event listener
   * @param {string} event - Event name
   * @param {Function} listener - Event listener
   * @returns {ButterConnector}
   */
  removeEventListener(event, listener) {
    this.off(event, listener);
    return this;
  }
}

module.exports = { ButterConnector };
