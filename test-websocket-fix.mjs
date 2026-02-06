#!/usr/bin/env node
/**
 * Quick test for butter-connector-browser.js WebSocket stability fix
 */

import { ButterConnector } from './src/services/butter-connector-browser.js';

console.log('🧪 Testing OpenButter WebSocket stability fix...\n');

// Test configuration
const TEST_DURATION_MS = 60000; // Run for 60 seconds
const connector = new ButterConnector();

let messageCount = 0;
let connectedAt = null;
let lastPingAt = null;

// Event listeners
connector.addEventListener('connected', () => {
  connectedAt = Date.now();
  console.log('✅ Connected to Gateway');
});

connector.addEventListener('disconnected', () => {
  const duration = connectedAt ? ((Date.now() - connectedAt) / 1000).toFixed(1) : 'unknown';
  console.log(`⚠️ Disconnected after ${duration}s`);
  connectedAt = null;
});

connector.addEventListener('message', (event) => {
  messageCount++;
  const data = event.detail;
  
  // Log key protocol messages
  if (data.type === 'event' && data.event === 'connect.challenge') {
    console.log('📨 Received connect.challenge, sending connect request...');
  } else if (data.type === 'res' && data.id?.includes('connect')) {
    console.log('✅ Gateway handshake completed');
  } else if (data.type === 'event' && data.event === 'tick') {
    if (!lastPingAt || Date.now() - lastPingAt > 30000) {
      console.log('💓 Tick received (connection healthy)');
      lastPingAt = Date.now();
    }
  }
});

connector.addEventListener('error', (event) => {
  console.error('❌ WebSocket error:', event.detail);
});

connector.addEventListener('reconnect_failed', () => {
  console.error('❌ Max reconnection attempts reached');
  process.exit(1);
});

// Start connection
console.log('Connecting to Gateway...');
connector.connect();

// Monitor for test duration
setTimeout(() => {
  console.log('\n📊 Test Results:');
  console.log(`   Duration: ${(TEST_DURATION_MS / 1000).toFixed(0)} seconds`);
  console.log(`   Messages received: ${messageCount}`);
  console.log(`   Connected: ${connector.connected ? 'Yes' : 'No'}`);
  
  if (connector.connected) {
    console.log('✅ Test passed - connection remained stable');
  } else {
    console.log('❌ Test failed - connection was lost');
  }
  
  connector.disconnect();
  process.exit(connector.connected ? 0 : 1);
}, TEST_DURATION_MS);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Disconnecting...');
  connector.disconnect();
  process.exit(0);
});
