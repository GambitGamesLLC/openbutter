# OpenButter QA Bug Report

**Date:** 2026-02-06
**Reviewed By:** QA Sub-Agent
**Scope:** Pre-launch code review

---

## Summary

| Category | Count |
|----------|-------|
| Critical Bugs | 6 |
| Warnings | 12 |
| Suggestions | 8 |

---

## Critical Bugs (Must Fix)

### 1. Missing Component File: `butter-settings.js`
- **File:** `tests/components/butter-settings.test.js`
- **Line:** 4
- **Issue:** Test file imports from `../../src/components/butter-settings.js` but the component file does not exist
- **Impact:** Test suite fails, missing settings UI functionality
- **Suggested Fix:** Create the `src/components/butter-settings.js` component or remove the test file if the feature is not yet implemented
- **Evidence:** 
  ```
  Error: Failed to resolve import "../../src/components/butter-settings.js"
  ```

### 2. CommonJS vs ES Modules Inconsistency
- **File:** `src/services/butter-connector.js`
- **Lines:** 1-12 (entire file)
- **Issue:** Uses `require()` and `module.exports` (CommonJS) while the rest of the codebase uses ES modules (`import`/`export`)
- **Impact:** Module loading errors in browser, inconsistency with `package.json` `"type": "module"`
- **Suggested Fix:** Convert to ES modules:
  ```javascript
  // Change from:
  const WebSocket = require('ws');
  const { EventEmitter } = require('events');
  module.exports = { ButterConnector };
  
  // To:
  import WebSocket from 'ws';
  import { EventEmitter } from 'events';
  export { ButterConnector };
  ```

### 3. Node.js WebSocket in Browser Context
- **File:** `src/services/butter-connector.js`
- **Lines:** 1, 80, 83, 144, etc.
- **Issue:** Uses Node.js `ws` package which will not work in browser environment. The `butter-connector.js` is imported in tests but uses Node-specific WebSocket implementation.
- **Impact:** Runtime errors when used in browser; architectural mismatch between server and client code
- **Suggested Fix:** Either:
  - Create separate `butter-connector-browser.js` using native `WebSocket` API
  - Add environment detection and use appropriate WebSocket implementation
  - Move Node.js connector to `src/server/` directory

### 4. Duplicate Class Definitions
- **File:** `src/main.js`
- **Lines:** 16-98 (`ButterConnector`), 101-158 (`ButterStore`)
- **Issue:** `ButterConnector` and `ButterStore` classes are defined in both `main.js` and their respective service files (`butter-connector.js`, `butter-store.js`). The versions in `main.js` are not used and create maintenance overhead.
- **Impact:** Code duplication, potential for divergent implementations, larger bundle size
- **Suggested Fix:** Remove the duplicate class definitions from `main.js` and import from service files:
  ```javascript
  import { ButterStore, butterStore } from './services/butter-store.js';
  // Note: butter-connector.js needs ES module conversion first
  ```

### 5. Event Listener Memory Leak in `ButterChat`
- **File:** `src/components/butter-chat.js`
- **Lines:** 43-51, 126-171
- **Issue:** Event listeners added in `attachEventListeners()` are attached to elements inside the component's light DOM. When `render()` is called (line 173), it replaces `innerHTML` which removes elements but doesn't clean up event listeners properly. The connector event listeners (if added) are also never removed.
- **Impact:** Memory leaks on repeated renders, potential for zombie event handlers
- **Suggested Fix:** 
  - Store references to event listeners for removal
  - Clear innerHTML before re-rendering to release listeners
  - Or use event delegation on a container element

### 6. Missing Event Listener Cleanup in `ButterApp`
- **File:** `src/main.js`
- **Lines:** 184-185
- **Issue:** Event listeners added to connector are never removed. If the butter-app element is removed from DOM, the closures may prevent garbage collection.
- **Impact:** Memory leak when app component is destroyed
- **Suggested Fix:** Add `disconnectedCallback` to `ButterApp` class to remove event listeners

---

## Warnings (Should Fix)

### 7. Typo in JSDoc Comment
- **File:** `src/services/butter-store.js`
- **Line:** 107
- **Issue:** `@param {boolean} [options.silent=false - Don't emit events` - missing closing bracket `]`
- **Suggested Fix:** Change to `@param {boolean} [options.silent=false] - Don't emit events`

### 8. Using `Array.from()` on potentially undefined
- **File:** `src/components/butter-chat.js`
- **Line:** 157
- **Issue:** `Array.from(e.dataTransfer?.files || [])` - good defensive coding but `|| []` is redundant since `Array.from(undefined)` returns `[]`
- **Suggested Fix:** Either `Array.from(e.dataTransfer?.files)` or keep as-is for clarity

### 9. Test File Uses Wrong Testing Framework
- **File:** `tests/unit/butter-connector.test.js`
- **Lines:** 1-5
- **Issue:** Uses Jest (`@jest/globals`) while all other tests use Vitest. Also excluded from Vitest config.
- **Impact:** Need to run separate test command (`npm run test:jest`), inconsistent tooling
- **Suggested Fix:** Migrate to Vitest or align all tests to use same framework

### 10. Vitest Config Excludes Connector Tests
- **File:** `vitest.config.js`
- **Line:** 10
- **Issue:** Explicitly excludes `tests/unit/butter-connector.test.js` from test suite
- **Impact:** Connector tests not run with main test suite
- **Suggested Fix:** Remove exclusion after migrating to Vitest, or document why it's excluded

### 11. `escapeHtml` Called on Potentially Null/Undefined
- **File:** `src/components/butter-chat.js`
- **Line:** 201
- **Issue:** `this.escapeHtml(orchestratorId)` - if attribute is null, passes null to escapeHtml
- **Suggested Fix:** Add null check: `orchestratorId ? this.escapeHtml(orchestratorId) : ''`

### 12. Unsafe `JSON.parse` without try-catch in main.js
- **File:** `src/main.js`
- **Lines:** 45-50 (in ButterConnector's onmessage)
- **Issue:** If server sends malformed JSON, it logs warning but doesn't handle the error gracefully for the event dispatch
- **Suggested Fix:** Already handled with try-catch, but could dispatch an `error` event for malformed messages

### 13. `getState()` Method Missing JSDoc
- **File:** `src/services/butter-store.js`
- **Line:** 298
- **Issue:** Public method lacks JSDoc documentation
- **Suggested Fix:** Add JSDoc:
  ```javascript
  /**
   * Get all current state (for debugging/testing)
   * @returns {Object} Deep cloned state object
   */
  ```

### 14. Missing `@returns` JSDoc for Private Methods
- **File:** `src/components/butter-sidebar.js`
- **Lines:** 310, 321
- **Issue:** `#formatTokenBurn` and `#escapeHtml` lack `@returns` annotations
- **Suggested Fix:** Add return type documentation

### 15. Unused Variables in Test Setup
- **File:** `tests/setup.js`
- **Line:** 1
- **Issue:** Comment says "Create a proper localStorage mock" but `vi` is not imported (relies on global)
- **Suggested Fix:** Add `import { vi } from 'vitest'` at top of file for clarity

### 16. Potential Race Condition in `connectedCallback`
- **File:** `src/components/butter-chat.js`
- **Lines:** 40-43
- **Issue:** `render()` is called before store subscription, but `_renderMessages()` is called in subscription. If store updates between render and subscription, message may be missed.
- **Suggested Fix:** Subscribe to store before initial render, or call `_renderMessages()` immediately after subscription

### 17. Test Relies on Global State (butterStore)
- **File:** `tests/components/butter-sidebar.test.js`, `butter-chat.test.js`
- **Issue:** Tests use shared `butterStore` singleton and call `reset()`, which could affect other tests if run in parallel
- **Suggested Fix:** Use dependency injection or create fresh store instances for each test

### 18. `hasOwnProperty` Check May Fail on Objects with Null Prototype
- **File:** `src/services/butter-store.js`
- **Line:** 89
- **Issue:** `ButterStore.defaults.hasOwnProperty(key)` - if `defaults` ever has null prototype, this would fail
- **Suggested Fix:** Use `Object.prototype.hasOwnProperty.call(ButterStore.defaults, key)`

---

## Suggestions (Nice to Have)

### 19. Add Input Validation to `setAttribute` Calls
- **File:** `src/components/butter-message.js`
- **Suggestion:** Add validation for `type` attribute to only allow 'text', 'code', 'image'

### 20. Use `CSSStyleSheet` for Better Performance
- **File:** `src/components/butter-sidebar.js`, `butter-message.js`
- **Suggestion:** Use `new CSSStyleSheet()` and `adoptedStyleSheets` instead of inline `<style>` for better performance and shareable styles

### 21. Add TypeScript Type Definitions
- **File:** All component files
- **Suggestion:** Add `.d.ts` files or JSDoc `@typedef` for component props/attributes for better IDE support

### 22. Add `part` Attributes for External Styling
- **File:** Shadow DOM components (`butter-sidebar.js`, `butter-message.js`)
- **Suggestion:** Add `part` attributes to key elements to allow external CSS customization via `::part()` selector

### 23. Debounce Typing Events More Efficiently
- **File:** `src/components/butter-chat.js`
- **Lines:** 137-155
- **Suggestion:** Current debounce creates new timeout on every keystroke. Consider using leading-edge debounce or throttling instead.

### 24. Add `loading="lazy"` to Images
- **File:** `src/components/butter-message.js`
- **Line:** 197 (in renderContent for 'image' type)
- **Suggestion:** Add `loading="lazy"` attribute to images for better performance

### 25. Use `requestAnimationFrame` for DOM Updates
- **File:** `src/components/butter-sidebar.js`
- **Suggestion:** Batch DOM updates with `requestAnimationFrame` for smoother rendering with many orchestrators

### 26. Add E2E Tests for Critical User Flows
- **File:** New file needed
- **Suggestion:** Add Playwright or Cypress tests for: connection flow, message sending, orchestrator switching

---

## Appendix: Test Results

```
Test Files  1 failed | 4 passed (5)
Tests       104 passed (104)
```

**Failed:** `tests/components/butter-settings.test.js` - Missing source file
**Passed:**
- `tests/unit/butter-store.test.js` (28 tests)
- `tests/components/butter-sidebar.test.js` (27 tests)
- `tests/components/butter-chat.test.js` (30 tests)
- `tests/components/butter-message.test.js` (19 tests)

**Excluded from Test Suite:**
- `tests/unit/butter-connector.test.js` (Jest-based, Node.js specific)

---

## Recommended Priority Order

1. **Create or remove** `butter-settings.js` (blocking test suite)
2. **Convert** `butter-connector.js` to ES modules and browser-compatible WebSocket
3. **Remove duplicate classes** from `main.js`
4. **Fix memory leaks** in `butter-chat.js` and `ButterApp`
5. **Fix JSDoc typos** and add missing documentation
6. **Unify testing framework** (migrate to Vitest)
7. **Address remaining warnings** and suggestions
