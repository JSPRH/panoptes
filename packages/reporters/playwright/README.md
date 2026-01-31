# Panoptes Playwright Reporter

Custom reporter for Playwright that sends test results directly to Convex.

## Installation

```bash
bun add -d @panoptes/reporter-playwright
```

## Configuration

Add the reporter to your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'
import PanoptesReporter from '@panoptes/reporter-playwright'

export default defineConfig({
  reporter: [
    ['list'],
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
  // ... rest of config
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
playwright test
```

The reporter will automatically send test results to Convex. Make sure `CONVEX_URL` is set in your environment.
