/**
 * @fileoverview ButterConnector WebSocket service unit tests
 * @module tests/unit/butter-connector
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { ButterConnector } = require('../../src/services/butter-connector');
const { WebSocketServer } = require('ws');

describe('ButterConnector', () => {
  let connector;
  let mockServer;
  let serverPort = 18789;

  beforeEach((done) => {
    // Create a mock WebSocket server for testing
    mockServer = new WebSocketServer({ port: serverPort }, done);
  });

  afterEach((done) => {
    if (connector) {
      connector.disconnect();
    }
    if (mockServer) {
      mockServer.close(done);
    } else {
      done();
    }
    connector = null;
  });

  describe('Connection Establishment', () => {
    it('should connect to WebSocket server successfully', (done) => {
      mockServer.on('connection', (ws) => {
        expect(ws).toBeDefined();
        done();
      });

      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      connector.connect();
    });

    it('should emit "connected" event when connection is established', (done) => {
      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      
      connector.addEventListener('connected', () => {
        expect(connector.isConnected()).toBe(true);
        done();
      });

      connector.connect();
    });

    it('should set connection state to true when connected', (done) => {
      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      
      connector.addEventListener('connected', () => {
        expect(connector.isConnected()).toBe(true);
        done();
      });

      connector.connect();
    });
  });

  describe('Reconnection', () => {
    it('should attempt reconnection after disconnect', (done) => {
      let connectionAttempts = 0;
      
      mockServer.on('connection', () => {
        connectionAttempts++;
        if (connectionAttempts === 2) {
          done();
        }
      });

      connector = new ButterConnector({ 
        url: `ws://localhost:${serverPort}`,
        reconnectInterval: 100,
        maxReconnectInterval: 1000
      });

      connector.addEventListener('connected', () => {
        if (connectionAttempts === 1) {
          // Simulate server disconnection
          mockServer.clients.forEach(client => client.close());
        }
      });

      connector.connect();
    });

    it('should emit "reconnecting" event with attempt count', (done) => {
      connector = new ButterConnector({ 
        url: `ws://localhost:${serverPort}`,
        reconnectInterval: 50,
        maxReconnectInterval: 200
      });

      let reconnectCount = 0;
      connector.addEventListener('reconnecting', (event) => {
        reconnectCount++;
        expect(event.detail.attempt).toBeGreaterThan(0);
        if (reconnectCount >= 1) {
          done();
        }
      });

      // Start with no server to trigger reconnection
      mockServer.close(() => {
        connector.connect();
      });
    });
  });

  describe('Message Sending', () => {
    it('should send JSON-RPC formatted messages when connected', (done) => {
      mockServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const message = JSON.parse(data.toString());
          expect(message).toHaveProperty('jsonrpc', '2.0');
          expect(message).toHaveProperty('method');
          expect(message).toHaveProperty('id');
          done();
        });
      });

      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      
      connector.addEventListener('connected', () => {
        connector.send('test.method', { foo: 'bar' });
      });

      connector.connect();
    });

    it('should queue messages when disconnected', () => {
      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      
      // Don't connect, just send
      connector.send('test.method', { foo: 'bar' });
      
      expect(connector.getQueueLength()).toBe(1);
    });

    it('should flush queue on reconnection', (done) => {
      let receivedMessages = 0;
      
      mockServer.on('connection', (ws) => {
        ws.on('message', () => {
          receivedMessages++;
          if (receivedMessages === 2) {
            done();
          }
        });
      });

      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      
      // Queue messages while disconnected
      connector.send('method1', {});
      connector.send('method2', {});
      expect(connector.getQueueLength()).toBe(2);

      connector.addEventListener('connected', () => {
        // Queue should be flushed after connection
        setTimeout(() => {
          expect(connector.getQueueLength()).toBe(0);
        }, 50);
      });

      connector.connect();
    });
  });

  describe('Event Emission', () => {
    it('should emit "message" event on incoming message', (done) => {
      mockServer.on('connection', (ws) => {
        // Send a message from server to client
        setTimeout(() => {
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            result: { success: true },
            id: 1
          }));
        }, 50);
      });

      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      
      connector.addEventListener('message', (event) => {
        expect(event.detail).toHaveProperty('jsonrpc', '2.0');
        expect(event.detail).toHaveProperty('result');
        done();
      });

      connector.connect();
    });

    it('should emit "error" event on connection error', (done) => {
      connector = new ButterConnector({ url: 'ws://invalid:99999' });
      
      connector.addEventListener('error', (event) => {
        expect(event.detail).toBeDefined();
        done();
      });

      connector.connect();
    });

    it('should emit "disconnected" event when connection closes', (done) => {
      mockServer.on('connection', (ws) => {
        setTimeout(() => {
          ws.close();
        }, 100);
      });

      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      
      connector.addEventListener('disconnected', () => {
        expect(connector.isConnected()).toBe(false);
        done();
      });

      connector.connect();
    });
  });

  describe('Exponential Backoff', () => {
    it('should increase reconnect delay exponentially', (done) => {
      const reconnectDelays = [];
      let lastTime = Date.now();

      // Close server to force reconnection attempts
      mockServer.close(() => {
        connector = new ButterConnector({ 
          url: `ws://localhost:${serverPort}`,
          reconnectInterval: 50,
          maxReconnectInterval: 500,
          reconnectDecay: 2
        });

        connector.addEventListener('reconnecting', () => {
          const now = Date.now();
          reconnectDelays.push(now - lastTime);
          lastTime = now;

          if (reconnectDelays.length >= 3) {
            // Check that delays are increasing
            expect(reconnectDelays[1]).toBeGreaterThan(reconnectDelays[0]);
            expect(reconnectDelays[2]).toBeGreaterThanOrEqual(reconnectDelays[1]);
            done();
          }
        });

        connector.connect();
      });
    });

    it('should cap reconnect interval at maxReconnectInterval', (done) => {
      const maxInterval = 200;
      
      mockServer.close(() => {
        connector = new ButterConnector({ 
          url: `ws://localhost:${serverPort}`,
          reconnectInterval: 50,
          maxReconnectInterval: maxInterval,
          reconnectDecay: 3
        });

        let highAttemptCount = 0;
        connector.addEventListener('reconnecting', (event) => {
          if (event.detail.attempt > 5) {
            // After many attempts, interval should be capped
            const calculatedInterval = connector.getCurrentReconnectInterval();
            expect(calculatedInterval).toBeLessThanOrEqual(maxInterval);
            highAttemptCount++;
            if (highAttemptCount >= 2) {
              done();
            }
          }
        });

        connector.connect();
      });
    });
  });

  describe('Heartbeat', () => {
    it('should send ping messages at configured interval', (done) => {
      let pingCount = 0;
      
      mockServer.on('connection', (ws) => {
        ws.on('ping', () => {
          pingCount++;
          if (pingCount >= 2) {
            done();
          }
        });
      });

      connector = new ButterConnector({ 
        url: `ws://localhost:${serverPort}`,
        heartbeatInterval: 100
      });

      connector.connect();
    });

    it('should emit "heartbeat" event on pong received', (done) => {
      mockServer.on('connection', (ws) => {
        ws.on('ping', () => {
          ws.pong();
        });
      });

      connector = new ButterConnector({ 
        url: `ws://localhost:${serverPort}`,
        heartbeatInterval: 100
      });

      connector.addEventListener('heartbeat', () => {
        done();
      });

      connector.connect();
    });
  });

  describe('JSON-RPC Format', () => {
    it('should generate unique message IDs', () => {
      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      
      const id1 = connector.generateId();
      const id2 = connector.generateId();
      
      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('number');
      expect(typeof id2).toBe('number');
    });

    it('should create valid JSON-RPC request objects', () => {
      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      
      const request = connector.createRequest('test.method', { key: 'value' });
      
      expect(request).toEqual({
        jsonrpc: '2.0',
        method: 'test.method',
        params: { key: 'value' },
        id: expect.any(Number)
      });
    });

    it('should handle JSON-RPC response callbacks', (done) => {
      mockServer.on('connection', (ws) => {
        ws.on('message', (data) => {
          const request = JSON.parse(data.toString());
          
          // Send response back
          ws.send(JSON.stringify({
            jsonrpc: '2.0',
            result: { data: 'response' },
            id: request.id
          }));
        });
      });

      connector = new ButterConnector({ url: `ws://localhost:${serverPort}` });
      
      connector.addEventListener('connected', () => {
        connector.send('test.method', {}, (response) => {
          expect(response.result).toEqual({ data: 'response' });
          done();
        });
      });

      connector.connect();
    });
  });

  describe('Configuration', () => {
    it('should use default options when not provided', () => {
      connector = new ButterConnector();
      
      expect(connector.options.url).toBe('ws://localhost:18789');
      expect(connector.options.reconnectInterval).toBe(1000);
      expect(connector.options.maxReconnectInterval).toBe(30000);
      expect(connector.options.heartbeatInterval).toBe(30000);
    });

    it('should merge custom options with defaults', () => {
      connector = new ButterConnector({ 
        url: 'ws://custom:1234',
        reconnectInterval: 500 
      });
      
      expect(connector.options.url).toBe('ws://custom:1234');
      expect(connector.options.reconnectInterval).toBe(500);
      expect(connector.options.maxReconnectInterval).toBe(30000); // default
    });
  });

  describe('Disconnection', () => {
    it('should stop reconnection attempts after disconnect() is called', (done) => {
      let reconnectAttempts = 0;
      
      mockServer.close(() => {
        connector = new ButterConnector({ 
          url: `ws://localhost:${serverPort}`,
          reconnectInterval: 50
        });

        connector.addEventListener('reconnecting', () => {
          reconnectAttempts++;
          if (reconnectAttempts === 2) {
            connector.disconnect();
            
            // Wait a bit to ensure no more reconnections happen
            setTimeout(() => {
              expect(reconnectAttempts).toBe(2);
              done();
            }, 200);
          }
        });

        connector.connect();
      });
    });

    it('should clear heartbeat interval on disconnect', (done) => {
      mockServer.on('connection', () => {
        setTimeout(() => {
          connector.disconnect();
          expect(connector.heartbeatTimer).toBeNull();
          done();
        }, 100);
      });

      connector = new ButterConnector({ 
        url: `ws://localhost:${serverPort}`,
        heartbeatInterval: 50
      });

      connector.connect();
    });
  });
});
