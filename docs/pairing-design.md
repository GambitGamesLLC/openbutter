# OpenButter Device Pairing Design Document

## Overview
OpenClaw Gateway requires device pairing for security. This document outlines the design for implementing device pairing in OpenButter.

## Current Gateway Behavior

From analyzing the Gateway source code:
- Gateway checks if device is paired on connection
- If not paired, it checks `canSkipDevice = sharedAuthOk`
- If can't skip, returns `NOT_PAIRED - device identity required`
- Device must be pre-registered in `~/.openclaw/devices/paired.json`

## Paired Device Structure

```json
{
  "deviceId": "sha256_hash_of_public_key",
  "publicKey": "base64_encoded_public_key",
  "platform": "Browser",
  "clientId": "openbutter",
  "clientMode": "webchat",
  "role": "operator",
  "scopes": ["gateway:rpc"],
  "tokens": {
    "operator": {
      "token": "random_token_string",
      "role": "operator",
      "scopes": ["gateway:rpc"]
    }
  }
}
```

## Proposed Solution: Shared Auth Bypass

Instead of full device pairing (which requires key generation and persistent identity), we can use the **shared auth bypass** that the Gateway already supports.

### How It Works

The Gateway code shows:
```javascript
const canSkipDevice = sharedAuthOk;
if (!canSkipDevice) {
  // Require device pairing
}
```

Where `sharedAuthOk` is true when the auth token matches the Gateway's configured token.

### Implementation

1. **Use the Gateway's shared auth token** in the handshake
2. **Set `client.id` to a recognized value** that can bypass pairing
3. **Include proper auth in handshake**

### Updated Handshake

```javascript
{
  type: 'req',
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
      token: 'c41df81f4efbf047b6aa0b0cb297536033274be12080dbe1' // Gateway token
    }
  }
}
```

## Alternative: Full Device Pairing

If shared auth doesn't work, implement full pairing:

### Phase 1: Key Generation
- Generate Ed25519 keypair using Web Crypto API
- Store keys in localStorage (or IndexedDB for better security)
- Derive deviceId from public key hash

### Phase 2: Pairing Request
- Connect to Gateway
- Receive NOT_PAIRED error
- Show pairing UI with deviceId
- User runs: `openclaw devices approve <device-id>`
- Reconnect and receive paired credentials

### Phase 3: Paired Connection
- Use device identity in all future handshakes
- Store tokens securely
- Rotate tokens as needed

## UI Design

### Pairing Modal States

1. **Initial Connection Failed**
   - Title: "Device Pairing Required"
   - Message: "This browser needs to be paired with your OpenClaw Gateway"
   - Show device ID (shortened)
   - Copy button for device ID

2. **Instructions**
   - Step 1: "Copy the device ID above"
   - Step 2: "Run this command in your terminal:"
   - Code block: `openclaw devices approve <device-id>`
   - Step 3: "Click 'I've Approved It' when done"

3. **Waiting State**
   - Show spinner
   - "Waiting for approval..."
   - Polling for status

4. **Success**
   - "Device paired successfully!"
   - Auto-close modal
   - Continue to app

5. **Error**
   - Show error message
   - Retry button

## Recommended Approach

**Start with Shared Auth** (simpler):
1. Try connecting with Gateway token in auth
2. See if Gateway accepts without device pairing
3. If works: minimal changes needed

**Fallback to Device Pairing** (if needed):
1. Implement full pairing flow
2. Generate keys
3. Show pairing UI
4. Handle approval process

## Files to Modify

1. **src/services/butter-connector-browser.js**
   - Update handshake to include auth token
   - Handle NOT_PAIRED error
   - Trigger pairing flow

2. **src/components/butter-pairing.js** (new)
   - Pairing modal component
   - State management for pairing flow
   - Device ID display

3. **src/main.js**
   - Listen for pairing-required events
   - Show pairing modal
   - Handle pairing completion

4. **src/services/device-identity.js** (new, if full pairing needed)
   - Key generation
   - Storage management
   - Device ID derivation

## Security Considerations

- Tokens stored in localStorage (acceptable for development)
- Keys generated in browser using Web Crypto API
- Device ID derived from public key (verifiable)
- Token rotation supported

## Implementation Priority

1. Try shared auth approach (1-2 hours)
2. If that fails, implement full pairing (1-2 days)
3. Add UI polish and error handling

## Testing

1. Clear localStorage
2. Open OpenButter
3. Verify pairing modal appears
4. Run approval command
5. Verify connection succeeds
6. Refresh page - should auto-connect
