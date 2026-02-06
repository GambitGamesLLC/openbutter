/**
 * ButterConnector (Browser Version) - Manages WebSocket connection to OpenButter backend
 *
 * Features:
 * - Browser-native WebSocket support
 * - Automatic reconnection with exponential backoff
 * - EventTarget-based event handling
 * - Simple JSON message protocol
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

    // Keepalive / heartbeat
    this.pingInterval = null;
    this.pingIntervalMs = 30000; // Send ping every 30 seconds
    this.pongTimeout = null;
    this.pongTimeoutMs = 10000; // Wait 10 seconds for pong response
    this.missedPongs = 0;
    this.maxMissedPongs = 2;
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
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
  }
}

export default ButterConnector;
