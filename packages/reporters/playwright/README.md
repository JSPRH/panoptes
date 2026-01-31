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

export default defineConfig({
  reporter: [
    ['list'],
    [
      '@justinmiehle/reporter-playwright',
      {
        convexUrl: process.env.CONVEX_URL,
        projectName: process.env.PANOPTES_PROJECT_NAME || 'my-project',
        environment: process.env.NODE_ENV || 'development',
        ci: process.env.CI === 'true',
        maxAttachmentSize: 1024 * 1024, // Optional: max attachment size in bytes (default: 1MB)
        debug: false, // Optional: enable debug logging for attachments
      },
    ],
  ],
  use: {
    screenshot: 'only-on-failure', // Enable screenshot capture on test failures
  },
  // ... rest of config
})
```

## Environment Variables

- `CONVEX_URL` - Convex deployment URL (required, e.g., `https://xxx.convex.cloud`)
- `PANOPTES_PROJECT_NAME` - Project name (default: `default-project`)
- `NODE_ENV` - Environment name
- `CI` - Set to `true` if running in CI

## Screenshot Capture

The reporter automatically captures and uploads screenshots from failed Playwright tests to Convex storage. Screenshots are displayed in the Panoptes UI alongside test results.

### Configuration

To enable screenshot capture, configure Playwright to take screenshots on failure:

```typescript
export default defineConfig({
  use: {
    screenshot: 'only-on-failure', // or 'on' for all tests
  },
})
```

### Attachment Options

The reporter supports the following optional configuration:

- `maxAttachmentSize` - Maximum attachment size in bytes (default: `1048576` = 1MB). Attachments larger than this limit will be skipped.
- `debug` - Enable debug logging for attachment processing (default: `false`). When enabled, logs attachment discovery, path resolution, and processing details.

### Supported Attachment Types

Currently, the reporter captures image attachments:
- PNG (`image/png`)
- JPEG (`image/jpeg`)
- GIF (`image/gif`)
- WebP (`image/webp`)

Screenshots are automatically included in test results when:
- Tests fail (if `screenshot: 'only-on-failure'` is configured)
- Tests use `testInfo.attach()` to manually attach screenshots

## Usage

Run your tests as usual:

```bash
playwright test
```

The reporter will automatically send test results (including screenshots from failed tests) to Convex. Make sure `CONVEX_URL` is set in your environment.
