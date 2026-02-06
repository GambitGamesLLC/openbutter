# Testing Strategy Review

**Reviewer Role:** Testing Expert  
**Date:** 2026-02-06  
**Document Reviewed:** `03-testing.md`

---

## Executive Summary

The testing strategy provides a solid foundation with clear test categorization and TDD guidance. However, given the project's unique challenges—Web Components, WebSocket communication, and distributed sub-agent architecture—there are significant gaps that need addressing before development begins.

---

## Top 3 Strengths

### 1. **Clear Test Taxonomy**

The three-tier approach (Unit → Component → Integration) is well-structured and appropriately mapped to Vitest's project feature. Using `--project` flags for filtering is a smart optimization for developer workflow.

```json
{
  "test:unit": "vitest --project unit",
  "test:integration": "vitest --project integration"
}
```

### 2. **Realistic Coverage Thresholds**

80% statements / 75% branches strikes the right balance. Too many projects aim for 100% coverage and waste time testing trivial getters/setters. These thresholds encourage meaningful tests while allowing practical exceptions.

### 3. **TDD Workflow Documentation**

Explicitly documenting the Red-Green-Refactor cycle sets the right cultural tone. New contributors immediately understand the expected workflow rather than inferring it.

---

## Top 5 Concerns & Improvements

### 🔴 **Concern 1: WebSocket Testing Is Completely Absent**

**Problem:** The architecture shows WebSocket connections between Gateway ↔ Orchestrator ↔ Sub-agents, yet there's no mention of how to test async real-time flows.

**Risk:** WebSocket bugs are notoriously hard to debug in production. Without testing strategy, expect race conditions and message ordering issues.

**Recommendation:**
```ts
// tests/integration/websocket.test.ts
import { MockWebSocket, wss } from 'vitest-websocket-mock';

describe('Gateway ↔ Orchestrator WebSocket', () => {
  it('handles message round-trip', async () => {
    const server = new WebSocket('ws://localhost:8080');
    await server.connected;
    
    server.send(JSON.stringify({ type: 'ping' }));
    await expect(server).toReceiveMessage({ type: 'pong' });
  });
});
```

**Required Tool:** Add `vitest-websocket-mock` or `mock-socket` to devDependencies.

---

### 🔴 **Concern 2: Web Component Testing Strategy Is Under-Specified**

**Problem:** "Happy DOM" is listed as the tool, but vanilla Web Components require more than just DOM methods. Custom element lifecycle, shadow DOM encapsulation, and attribute changes need specific testing patterns.

**Risk:** Happy DOM has limited shadow DOM support. Component tests may pass locally but fail in real browsers due to custom element lifecycle differences.

**Recommendation:**
1. **Add browser-based component testing:**
   ```json
   {
     "test:component": "vitest --browser.headless",
     "test:component:ui": "vitest --browser"
   }
   ```

2. **Create Web Component test helpers:**
   ```ts
   // tests/helpers/custom-elements.ts
   export async function mount<T extends HTMLElement>(
     tag: string,
     attrs: Record<string, string> = {}
   ): Promise<T> {
     const el = document.createElement(tag) as T;
     Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
     document.body.appendChild(el);
     await customElements.whenDefined(tag);
     return el;
   }
   ```

3. **Consider Playwright or Web Test Runner** for critical component paths.

---

### 🟡 **Concern 3: Missing E2E / Simulation Tests**

**Problem:** The architecture has complex multi-agent flows (Orchestrator → spawns Sub-agent → uses Tools → returns to Gateway). No test layer validates this full chain.

**Gap:** Integration tests cover API chains, but not the actual spawning and message passing between distributed components.

**Recommendation:**
Add a fourth test tier:

```ts
// tests/e2e/full-flow.test.ts
describe('Complete Request Flow', () => {
  it('orchestrator spawns sub-agent and returns result', async () => {
    const gateway = await startTestGateway();
    const response = await gateway.sendCommand({
      message: 'Research Node.js best practices',
      channel: 'discord',
      user: 'test-user'
    });
    
    expect(response.status).toBe('completed');
    expect(response.subAgentCalls).toHaveLength(1);
    expect(response.toolsUsed).toContain('web_search');
  });
});
```

---

### 🟡 **Concern 4: No Test Data Strategy**

**Problem:** No mention of fixtures, factories, or test data management. With Memory module persistence, tests need predictable baseline states.

**Risk:** Tests become brittle, depend on file system state, or conflict when run in parallel.

**Recommendation:**
```ts
// tests/fixtures/orchestrator.ts
export const orchestratorFactory = Factory.define(({ sequence }) => ({
  id: `orch-${sequence}`,
  name: `Test Orchestrator ${sequence}`,
  createdAt: new Date().toISOString(),
  context: defaultContext,
}));

// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],
    pool: 'threads', // Isolate file-based tests
    poolOptions: {
      threads: {
        useAtomics: true,
      },
    },
  },
});
```

---

### 🟡 **Concern 5: TDD May Be Impractical for WebSocket/Component Work**

**Problem:** The TDD workflow assumes testable units can be written before implementation. WebSocket protocols and Web Component shadow DOM designs often need exploration first.

**Risk:** Blindly following TDD may lead to rewriting tests multiple times as implementation realities emerge.

**Recommendation:**
Add nuance to the TDD section:

```markdown
## TDD Workflow (with exceptions)

**Standard Flow (Unit/Integration):**
1. Red → Green → Refactor

**Exploration-Heavy Work (WebSocket protocols, new Web Components):**
1. **Spike:** Build minimal working version to understand constraints
2. **Document:** Capture discovered edge cases
3. **Test:** Write tests against working behavior
4. **Refactor:** Clean up both code and tests

The spike code can be thrown away or kept—the tests are the specification.
```

---

## Suggested Test Priorities

### Phase 1: Foundation (Week 1-2)
**Goal:** Catch regressions in core algorithms

1. **Utility functions** (`calculateSpread`, data transformers)
2. **Memory module** (file persistence, context loading)
3. **Provider routing** (LLM selection logic)

These have pure inputs/outputs—perfect for TDD and fast feedback.

### Phase 2: Gateway & Channels (Week 3-4)
**Goal:** Validate message routing integrity

1. **Message parsing/formatting** (channel-specific adapters)
2. **Gateway routing logic** (which orchestrator receives which message)
3. **MSW-based API mocks** for external channel APIs

### Phase 3: Web Components (Week 5-6)
**Goal:** UI renders correctly, user interactions work

1. **butter-message** (simplest—test attribute changes, event dispatching)
2. **butter-sidebar** (navigation state, event bubbling)
3. **butter-chat** (child component coordination, scroll behavior)

Use browser-mode Vitest or Playwright component tests here.

### Phase 4: Integration & WebSocket (Week 7-8)
**Goal:** Full sub-agent lifecycle works end-to-end

1. **WebSocket message protocol** (ordering, reconnection, error handling)
2. **Orchestrator → sub-agent spawning** (lifecycle events, timeout handling)
3. **Tool execution chains** (web search → summarize → respond)

These require the most test infrastructure—save until patterns stabilize.

---

## Vitest Assessment

### ✅ **Why Vitist Is Appropriate**

| Factor | Assessment |
|--------|------------|
| **Vanilla JS** | Native ESM support, no transpilation needed |
| **Speed** | Faster than Jest for ESM projects |
| **Web Components** | Browser mode available (experimental but usable) |
| **TypeScript** | First-class support, no extra config |
| **Coverage** | Built-in v8 coverage, no Istanbul config |

### ⚠️ **Caveats**

1. **Happy DOM limitations:** Shadow DOM slot behavior differs from real browsers. Consider `@vitest/browser` or Playwright for component tests.

2. **WebSocket mocking:** Vitest has no built-in WS mock. The `vitest-websocket-mock` package works but adds dependency.

3. **Worker thread tests:** If sub-agents run in Worker threads, test that specifically—Vitest's pool isolation differs from production.

---

## Additional Recommendations

### 1. Add Contract Tests for Channel Integrations

Discord/WhatsApp APIs change. Add lightweight contract tests:

```ts
// tests/contracts/discord.test.ts
describe('Discord API Contract', () => {
  it(' message format matches expected schema', async () => {
    const message = await fetchSampleMessage();
    expect(message).toMatchSchema(discordMessageSchema);
  });
});
```

### 2. Performance Regression Tests

Given real-time message flow, add:

```ts
it('processes 100 messages within 500ms', async () => {
  const start = performance.now();
  await processBatch(generateMessages(100));
  expect(performance.now() - start).toBeLessThan(500);
});
```

### 3. Visual Regression for Web Components

Consider Chromatic or Storybook test runner for UI components once designs stabilize.

---

## Summary Checklist

Before development begins:

- [ ] Add WebSocket mocking library (`vitest-websocket-mock`)
- [ ] Configure browser-mode Vitest OR add Playwright component tests
- [ ] Create test helper utilities for custom element lifecycle
- [ ] Implement fixture/factory system for test data
- [ ] Set up isolated test environments for file-based Memory tests
- [ ] Document spike-then-test workflow for exploratory work
- [ ] Add CI step that runs `test:ci` with coverage thresholds enforced
- [ ] (Optional) Add contract tests for external APIs

---

*Review completed. The strategy is a good foundation—the gaps identified above are addressable with the recommended additions.*
