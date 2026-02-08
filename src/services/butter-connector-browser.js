/**
 * ButterConnector (Browser Version) - Manages WebSocket connection to OpenClaw Gateway
 *
 * Features:
 * - Browser-native WebSocket support
 * - Automatic reconnection with exponential backoff
 * - EventTarget-based event handling
 * - Simple JSON message protocol
 * - Keepalive ping/pong
 */

export class ButterConnector extends EventTarget {
  constructor(url = null, token = null, options = {}) {
    super();

    // Backward compatibility: Extract token from URL if provided there but not as arg
    if (url && !token && typeof url === 'string' && (url.includes('?token=') || url.includes('&token='))) {
      try {
        const urlObj = new URL(url);
        token = urlObj.searchParams.get('token');
        // Clean token from URL
        urlObj.searchParams.delete('token');
        url = urlObj.toString();
      } catch (e) {
        console.warn('Could not extract token from URL:', e);
      }
    }

    this.url = url || this._getDefaultUrl();
    this.token = token;
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000;
    this.connectRequestId = null;
    this.shouldReconnect = true; // Control reconnection behavior

    // Keepalive / heartbeat
    this.pingInterval = null;
    this.pingIntervalMs = 5000; // Send ping every 5 seconds
    this.pongTimeout = null;
    this.pongTimeoutMs = 3000; // Wait 3 seconds for pong response
    this.missedPongs = 0;
    this.maxMissedPongs = 2;
  }

  _getDefaultUrl() {
    // OpenClaw Gateway default WebSocket port (use 127.0.0.1 for loopback binding compatibility)
    return `ws://127.0.0.1:18789`;
  }

  async connect() {
    // Reset reconnect flag on new connection attempt
    this.shouldReconnect = true;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log('Socket open, waiting for handshake...');
      };

      this.ws.onclose = () => {
        if (this.connected) {
          console.log('🔌 Disconnected from OpenButter');
        }
        this.connected = false;
        this._stopKeepalive();
        this.dispatchEvent(new CustomEvent('disconnected'));
        
        // Only reconnect if allowed
        if (this.shouldReconnect) {
          this._attemptReconnect();
        } else {
          console.log('🔌 Reconnection stopped (shouldReconnect=false)');
        }
      };

      this.ws.onerror = (error) => {
        console.error('🔌 WebSocket error: Is OpenClaw Gateway running? (openclaw gateway status)');
        this.dispatchEvent(new CustomEvent('error', { detail: error }));
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle handshake challenge
          if (data.type === 'event' && data.event === 'connect.challenge') {
            this._sendHandshake(data.payload.nonce);
            return;
          }

          // Handle handshake response
          if (data.type === 'res' && data.id === this.connectRequestId) {
            if (data.ok) {
              console.log('🔌 Connected to OpenButter (Handshake OK)');
              this.connected = true;
              this.reconnectAttempts = 0;
              this.missedPongs = 0;
              this._startKeepalive();
              this.dispatchEvent(new CustomEvent('connected'));
            } else {
              console.error('Handshake failed:', data.error);
              // Fatal auth error - do not reconnect
              this.shouldReconnect = false;
              this.disconnect();
            }
            return;
          }

          // Handle pong response
          if (data.type === 'pong') {
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

  _sendHandshake(nonce) {
    this.connectRequestId = 'req-' + Date.now();

    // Get Gateway token from URL or use default
    const urlParams = new URLSearchParams(window.location.search);
    const gatewayToken = urlParams.get('token') || 'c41df81f4efbf047b6aa0b0cb297536033274be12080dbe1';

    const handshake = {
      type: 'req',
      id: this.connectRequestId,
      method: 'connect',
      params: {
        minProtocol: 3,
        maxProtocol: 3,
        client: {
          id: 'openbutter-browser',
          version: '0.1.0',
          platform: 'browser',
          mode: 'webchat',
          displayName: 'OpenButter Browser'
        },
        caps: ['rpc'],
        scopes: ['gateway:rpc'],
        auth: {
          token: gatewayToken
        }
      }
    };
    
    if (this.ws) {
      this.ws.send(JSON.stringify(handshake));
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
   * Send a ping message
   * @private
   */
  _sendPing() {
    if (!this.connected || !this.ws) {
      return;
    }

    try {
      this.ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));

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
      // Note: disconnect() triggers onclose which handles reconnect via shouldReconnect (true by default)
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

export default ButterConnector;
