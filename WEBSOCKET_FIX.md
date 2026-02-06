# WebSocket Stability Fix for OpenButter

## Problem
The WebSocket connection was cycling endlessly - connecting then disconnecting every ~10 seconds.

## Root Cause Analysis
1. **No Gateway Handshake**: The connector wasn't responding to the Gateway's `connect.challenge` event
2. **Incorrect Ping Format**: The Gateway doesn't support custom JSON ping/pong messages (`{type: 'ping'}`)
3. **Long Ping Interval**: 30-second ping interval exceeded the Gateway's likely idle timeout
4. **No Protocol Support**: Missing proper OpenClaw Gateway protocol implementation

## Changes Made

### 1. butter-connector-browser.js (ESM/Browser Version)

#### Ping Interval Changes
- **Before**: 30s ping interval, 10s pong timeout
- **After**: 10s ping interval, 5s pong timeout

#### Gateway Protocol Support Added
- **Handshake**: Respond to `connect.challenge` with proper `connect` request
- **Connect Request Format**:
  ```json
  {
    "type": "req",
    "id": "<unique-id>",
    "method": "connect",
    "params": {
      "minProtocol": 1,
      "maxProtocol": 1,
      "client": {
        "id": "openbutter",
        "version": "0.1.0",
        "platform": "browser",
        "mode": "web"
      },
      "caps": ["rpc"],
      "role": "client",
      "scopes": ["gateway:rpc"],
      "auth": { "token": "..." }
    }
  }
  ```

#### Keepalive Mechanism
- Browser WebSocket doesn't expose native ping frames
- Sends lightweight `health` RPC call instead of custom JSON ping
- Handles Gateway `tick` events as keepalive confirmation

### 2. butter-connector.cjs (CommonJS/Node.js Version)

#### Ping Interval Changes
- **Before**: 30s heartbeat interval
- **After**: 10s heartbeat interval

#### Gateway Protocol Support Added
- Same handshake support as browser version
- Uses native `ws.ping()` when available (Node.js ws library)
- Same connect request format

## Testing

A test script was created at `test-websocket-fix.mjs`:
```bash
node test-websocket-fix.mjs
```

This runs a 60-second connection test and verifies:
- Handshake completes successfully
- Connection remains stable
- No unexpected disconnections

## Key Implementation Details

### Gateway Protocol
The OpenClaw Gateway expects:
1. **Immediate Response**: First message after connection must be a `connect` request
2. **Frame Format**: All messages use `{type: 'req'|'res'|'event', ...}` format
3. **Authentication**: Token can be passed via URL query param or in connect params
4. **Keepalive**: Gateway sends `tick` events periodically; client can send `health` RPC

### Ping/Pong Strategy
- **Node.js**: Uses native `ws.ping()`/`ws.pong()` (WebSocket standard)
- **Browser**: Sends `health` RPC call every 10s; expects any response
- **Timeout**: 5 seconds to receive response before counting as missed
- **Reconnection**: After 2 missed pongs, forces reconnection

## Backward Compatibility

The changes maintain backward compatibility:
- Legacy `{type: 'pong'}` messages are still handled
- JSON-RPC format is still supported in CJS version
- Existing event emitters continue to work

## Future Improvements

1. **Native Ping in Browser**: Not possible due to browser WebSocket API limitations
2. **Device Auth**: Could implement Ed25519 device signing for enhanced security
3. **Reconnection**: Exponential backoff with jitter could be added
4. **Connection Pooling**: Support multiple concurrent connections for redundancy
