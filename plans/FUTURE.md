# OpenButter Future Plans

## Current Status (v0.1.0)
- ✅ Full UI with sidebar, chat, settings
- ✅ Auto-discovery of OpenClaw agents  
- ✅ Dark theme, responsive design
- ✅ Log capture for debugging
- ⚠️ WebSocket cycling (known issue)

## Priority 1: WebSocket Stability
**Issue:** Connection cycles every ~10 seconds

**Investigation needed:**
- Gateway protocol documentation
- Proper handshake sequence (`connect.challenge` response format)
- Authentication heartbeat requirements
- Native ping frame vs JSON message support

**Options:**
1. Research OpenClaw Gateway protocol specs
2. Use existing OpenClaw client library if available
3. Accept cycling and implement queue/retry logic
4. Switch to HTTP polling as fallback

## Priority 2: Chat Functionality
**Not yet implemented:**
- Sending messages to orchestrators
- Receiving responses in chat bubbles
- Message history persistence
- Typing indicators
- File attachments

**Implementation:**
- Wire butter-chat message-send event to WebSocket
- Handle incoming messages from Gateway
- Display in butter-message components
- Store conversation history

## Priority 3: Settings Panel
**Current:** Settings UI exists but not fully functional

**Features to add:**
- Theme toggle (light/dark/system)
- Notification settings
- Model selection for templates
- Cost estimates from OpenRouter API
- Gateway URL configuration

## Priority 4: Orchestrator Management
**Current:** Auto-discovery works, manual creation not implemented

**Features:**
- "+ New" button functionality
- Configure orchestrator templates
- Set model, thinking level, cost limits
- Delete/archiving orchestrators

## Priority 5: Polish & Release
- Remove debug logging
- Add loading states
- Error boundaries for components
- Keyboard shortcuts (Ctrl+K command palette?)
- Mobile responsiveness testing
- README screenshots/gifs
- GitHub release

## Technical Debt
- Remove debug-logger.js if not using
- Clean up auto-logger (reduce log volume)
- Add proper error handling for all async operations
- Unit test coverage for WebSocket edge cases

## Long-term Ideas
- Plugin system for custom orchestrators
- Multi-gateway support
- Team/collaboration features
- Message reactions/threads
- Voice mode (integrate with OpenClaw voice)
