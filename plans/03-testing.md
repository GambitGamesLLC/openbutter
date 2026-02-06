# Testing Strategy

**Runner:** Vitest (`npm test`)

## Test Types

| Type | Target | Location | Tooling |
|------|--------|----------|---------|
| Unit | Pure functions, utilities | `tests/unit/*.test.ts` | Vitest |
| Component | DOM, user interactions | `tests/component/*.test.ts` | Vitest + Happy DOM |
| Integration | Full flows, API chains | `tests/integration/*.test.ts` | Vitest + MSW |

## File Naming

- Test files: `*.test.ts`
- Co-locate with source or use `tests/` mirror
- One test file per module/component

## Example: Unit Test Skeleton

```ts
// tests/unit/calculateSpread.test.ts
import { describe, it, expect } from 'vitest';
import { calculateSpread } from '@/lib/calculateSpread';

describe('calculateSpread', () => {
  it('returns spread between bid and ask', () => {
    const result = calculateSpread({ bid: 100, ask: 102 });
    expect(result).toBe(2);
  });

  it('handles zero spread', () => {
    const result = calculateSpread({ bid: 100, ask: 100 });
    expect(result).toBe(0);
  });
});
```

## TDD Workflow

1. **Red** — Write failing test first
2. **Green** — Write minimal code to pass
3. **Refactor** — Clean up, keep tests green

## Scripts

```json
{
  "test": "vitest",
  "test:unit": "vitest --project unit",
  "test:ci": "vitest --run --coverage"
}
```

## Coverage Threshold

- Statements: 80%
- Branches: 75%

Run: `npx vitest --coverage`
