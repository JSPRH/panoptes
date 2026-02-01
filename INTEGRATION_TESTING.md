# Integration Testing with convex-test

This document describes the integration testing setup for the Panoptes web app using `convex-test`.

## Setup

The integration test environment is configured to use `convex-test` for testing Convex backend functions and React components that depend on Convex data.

### Dependencies

- `convex-test`: Mock Convex backend for testing
- `@edge-runtime/vm`: Required runtime for convex-test
- `vitest`: Test runner

### Configuration

The Vitest configuration (`vitest.config.ts`) is set up to:
- Use `edge-runtime` environment for Convex integration tests
- Use `jsdom` environment for React component tests
- Inline `convex-test` dependencies for better tracking

## Test Structure

### Backend Integration Tests

Backend integration tests are located in `convex/__tests__/` and test Convex functions directly using `convex-test`.

Example:
```typescript
import { convexTest } from "convex-test";
import schema from "../schema";
import { api } from "../_generated/api";

const t = convexTest(schema, modules);

const stats = await t.query(api.tests.getDashboardStats);
expect(stats.projectCount).toBe(0);
```

### Component Integration Tests

Component integration tests are located in `apps/web/src/pages/__tests__/` and test React components with mocked Convex hooks that use `convex-test` for data.

## Running Tests

```bash
# Run backend integration tests (using bun test)
bun test convex/__tests__/tests.integration.test.ts

# Run utility tests (using bun test)
bun test tests/utils.test.ts

# Run all tests with bun test (excludes e2e and spec files)
bun test

# Run React component integration tests (using vitest - requires jsdom)
bunx vitest run apps/web/src/pages/__tests__/*.integration.test.tsx

# Run all vitest tests (includes React component tests)
bun run test:vitest
```

**Note:** React component integration tests require `jsdom` environment and should be run with vitest, not bun test. Backend integration tests use `edge-runtime` and work with both bun test and vitest.

## Test Helpers

The `apps/web/src/test-utils/convex-test-helper.tsx` file provides utilities for:
- Creating test instances
- Setting up test projects
- Creating test runs with sample data

## Notes

- `import.meta.glob` doesn't work in edge-runtime, so modules are manually imported
- Tests use a mock ConvexReactClient that delegates to convex-test
- Component tests pre-populate query results for synchronous rendering

## Pages with Integration Tests

- **Dashboard** (`Dashboard.integration.test.tsx`): Tests dashboard stats and test run display
- **TestRuns** (`TestRuns.integration.test.tsx`): Tests test run listing and filtering
- **Anomalies** (`Anomalies.integration.test.tsx`): Tests anomaly detection and display
