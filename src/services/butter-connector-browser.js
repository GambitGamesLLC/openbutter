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
  }

  _getDefaultUrl() {
    // OpenClaw Gateway default WebSocket port
    return 'ws://localhost:18789';
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

export default ButterConnector;
