/**
 * ButterConnector (Browser Version) - Manages WebSocket connection to OpenButter backend
 *
 * Features:
 * - Browser-native WebSocket support
 * - Automatic reconnection with exponential backoff
 * - EventTarget-based event handling
 * - OpenClaw Gateway protocol support (handshake, ping/pong, RPC)
 *
 * WebSocket Stability Fix (2026-02-06):
 * - Reduced ping interval from 30s to 10s to prevent Gateway timeout
 * - Added proper Gateway handshake (respond to connect.challenge)
 * - Changed from custom JSON ping to Gateway health RPC calls
 * - Added request/response tracking for Gateway protocol
 * - Reduced pong timeout from 10s to 5s for faster failure detection
 */

export class ButterConnector extends EventTarget {
  constructor(url = null) {
    super();
    this.url = url || this._getDefaultUrl();
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;

    // Keepalive / heartbeat - use shorter intervals to prevent Gateway timeout
    this.pingInterval = null;
    this.pingIntervalMs = 10000; // Send ping every 10 seconds (reduced from 30s)
    this.pongTimeout = null;
    this.pongTimeoutMs = 5000; // Wait 5 seconds for pong response (reduced from 10s)
    this.missedPongs = 0;
    this.maxMissedPongs = 2;

    // Gateway protocol
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.connectedClient = null;
    this.connectRequestId = null;
  }

  _getDefaultUrl() {
    // OpenClaw Gateway default WebSocket port (use 127.0.0.1 for loopback binding compatibility)
    // Token auth required - passed as query param for browser WebSocket
    const token = 'c41df81f4efbf047b6aa0b0cb297536033274be12080dbe1';
    return `ws://127.0.0.1:18789/?token=${token}`;
  }

  async connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('🔌 Connected to OpenButter');
        this.connected = true;
        this.reconnectAttempts = 0;
        this.missedPongs = 0;
        this._startKeepalive();
        this.dispatchEvent(new CustomEvent('connected'));
      };

      this.ws.onclose = () => {
        if (this.connected) {
          console.log('🔌 Disconnected from OpenButter');
        }
        this.connected = false;
        this._stopKeepalive();
        this.dispatchEvent(new CustomEvent('disconnected'));
        this._attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('🔌 WebSocket error: Is OpenClaw Gateway running? (openclaw gateway status)');
        this.dispatchEvent(new CustomEvent('error', { detail: error }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle Gateway protocol messages
          if (data.type === 'event' && data.event === 'connect.challenge') {
            // Respond to Gateway handshake challenge
            this._sendConnectRequest(data.payload?.nonce);
            return;
          }

          if (data.type === 'res' && data.id === this.connectRequestId) {
            // Handle connect response
            if (data.ok) {
              this.connectedClient = data.payload;
              console.log('🔌 Gateway handshake completed');
            } else {
              console.error('🔌 Gateway handshake failed:', data.error);
              this.disconnect();
            }
            return;
          }

          // Handle response frames for pending requests
          if (data.type === 'res' && data.id) {
            const pending = this.pendingRequests.get(data.id);
            if (pending) {
              this.pendingRequests.delete(data.id);
              if (data.ok) {
                pending.resolve(data.payload);
              } else {
                pending.reject(new Error(data.error?.message || 'Request failed'));
              }
            }
            return;
          }

          // Handle legacy pong response (for backward compatibility)
          if (data.type === 'pong') {
            this._handlePong();
            return;
          }

          // Handle Gateway tick (keepalive confirmation)
          if (data.type === 'event' && data.event === 'tick') {
            // Tick received, connection is alive
            this._handlePong();
            return;
          }

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

  /**
   * Start the keepalive ping interval
   * @private
   */
  _startKeepalive() {
    this._stopKeepalive();
    this.pingInterval = setInterval(() => {
      this._sendPing();
    }, this.pingIntervalMs);
  }

  /**
   * Stop the keepalive ping interval
   * @private
   */
  _stopKeepalive() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  /**
   * Send connect request to Gateway
   * @private
   */
  _sendConnectRequest(nonce) {
    if (!this.ws) return;

    this.connectRequestId = this._generateRequestId();
    const connectMsg = {
      type: 'req',
      id: this.connectRequestId,
      method: 'connect',
      params: {
        minProtocol: 1,
        maxProtocol: 1,
        client: {
          id: 'openbutter',
          version: '0.1.0',
          platform: 'browser',
          mode: 'web'
        },
        caps: ['rpc'],
        role: 'client',
        scopes: ['gateway:rpc']
      }
    };

    // If we have a token in the URL, add it to auth
    const url = new URL(this.url);
    const token = url.searchParams.get('token');
    if (token) {
      connectMsg.params.auth = { token };
    }

    try {
      this.ws.send(JSON.stringify(connectMsg));
    } catch (error) {
      console.error('Failed to send connect request:', error);
    }
  }

  /**
   * Generate unique request ID
   * @private
   */
  _generateRequestId() {
    return `req_${++this.requestId}_${Date.now()}`;
  }

  /**
   * Send a ping message
   * @private
   */
  _sendPing() {
    if (!this.connected || !this.ws) {
      return;
    }

    try {
      // Use native WebSocket ping if available (Node.js ws library)
      if (typeof this.ws.ping === 'function') {
        this.ws.ping();
      } else {
        // For browser WebSocket, send a minimal message or use Gateway tick
        // Browser WebSocket doesn't expose ping frames, so we rely on the
        // Gateway's tick events or send a lightweight RPC call
        this.ws.send(JSON.stringify({
          type: 'req',
          id: this._generateRequestId(),
          method: 'health',
          params: {}
        }));
      }

      // Set timeout for pong response
      this.pongTimeout = setTimeout(() => {
        this._handlePongTimeout();
      }, this.pongTimeoutMs);
    } catch (error) {
      console.error('Failed to send ping:', error);
    }
  }

  /**
   * Handle pong response from server
   * @private
   */
  _handlePong() {
    // Reset missed pongs counter on successful pong
    this.missedPongs = 0;

    // Clear the pong timeout
    if (this.pongTimeout) {
      clearTimeout(this.pongTimeout);
      this.pongTimeout = null;
    }
  }

  /**
   * Handle pong timeout - no response received
   * @private
   */
  _handlePongTimeout() {
    this.missedPongs++;
    console.warn(`🔌 Pong timeout (${this.missedPongs}/${this.maxMissedPongs})`);

    if (this.missedPongs >= this.maxMissedPongs) {
      console.error('🔌 Too many missed pongs, reconnecting...');
      this.disconnect();
      this._attemptReconnect();
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
    this._stopKeepalive();

    // Reject all pending requests
    for (const pending of this.pendingRequests.values()) {
      pending.reject(new Error('Connection closed'));
    }
    this.pendingRequests.clear();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.connectedClient = null;
    this.connectRequestId = null;
  }
}

export default ButterConnector;
