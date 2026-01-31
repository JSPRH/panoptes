# Panoptes Playwright Reporter

Custom reporter for Playwright that sends test results directly to Convex.

Published as **@justinmiehle/reporter-playwright** on [GitHub Packages](https://github.com/JustinMiehle?tab=packages).

## Installation

From GitHub Packages (e.g. in another repo or GitHub Action), configure npm to use the scope and authenticate, then:

```bash
bun add -d @justinmiehle/reporter-playwright
```

Consumers need an `.npmrc` with `@justinmiehle:registry=https://npm.pkg.github.com` and auth (e.g. `GITHUB_TOKEN` in CI). To publish new versions, run the "Publish reporters to GitHub Packages" workflow or see SETUP.md.

## Configuration

Add the reporter to your `playwright.config.ts`:

```typescript
import { defineConfig } from '@playwright/test'
import PanoptesReporter from '@justinmiehle/reporter-playwright'

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
