# Panoptes Vitest Reporter

Custom reporter for Vitest that sends test results directly to Convex.

## Installation

```bash
bun add -d @panoptes/reporter-vitest
```

## Configuration

Add the reporter to your `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import PanoptesReporter from '@panoptes/reporter-vitest'

export default defineConfig({
  test: {
    reporters: [
      'default',
      [
        PanoptesReporter,
        {
          convexUrl: process.env.CONVEX_URL,
          projectName: process.env.PANOPTES_PROJECT_NAME || 'my-project',
          environment: process.env.NODE_ENV || 'development',
          ci: process.env.CI === 'true',
        },
      ],
    ],
  },
})
```

## Environment Variables

- `CONVEX_URL` - Convex deployment URL (required, e.g., `https://xxx.convex.cloud`)
- `PANOPTES_PROJECT_NAME` - Project name (default: `default-project`)
- `NODE_ENV` - Environment name
- `CI` - Set to `true` if running in CI

## Usage

Run your tests as usual:

```bash
vitest run
```

The reporter will automatically send test results to Convex. Make sure `CONVEX_URL` is set in your environment.
