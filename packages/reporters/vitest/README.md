# Panoptes Vitest Reporter

Custom reporter for Vitest that sends test results directly to Convex.

Published as **@justinmiehle/reporter-vitest** on [GitHub Packages](https://github.com/JustinMiehle?tab=packages).

## Installation

### Within the Panoptes Monorepo

If you're using this reporter in another package within the Panoptes monorepo, use the workspace protocol:

```bash
bun add -d @justinmiehle/reporter-vitest@workspace:*
```

This will reference the local package directly without needing to publish or use a local registry.

### Outside the Monorepo (GitHub Packages)

Install from GitHub Packages. You need to point the `@justinmiehle` scope at GitHub's registry and authenticate.

**In a GitHub Action** (other repo), add a step before installing dependencies:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    registry-url: 'https://npm.pkg.github.com'
    scope: '@justinmiehle'
- run: bun install  # or npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Create an `.npmrc` in that repo (or inject it in CI):

```
@justinmiehle:registry=https://npm.pkg.github.com
```

Then install:

```bash
bun add -d @justinmiehle/reporter-vitest
```

**Local / other CI:** Use a [Personal Access Token](https://github.com/settings/tokens) with `read:packages` and set `NODE_AUTH_TOKEN` or use `npm login` against `https://npm.pkg.github.com`.

## Configuration

Add the reporter to your `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'
import PanoptesReporter from '@justinmiehle/reporter-vitest'

export default defineConfig({
  test: {
    reporters: [
      'default',
      new PanoptesReporter({
        convexUrl: process.env.CONVEX_URL,
        projectName: process.env.PANOPTES_PROJECT_NAME || 'my-project',
        environment: process.env.NODE_ENV || 'development',
        ci: process.env.CI === 'true',
      }),
    ],
  },
})
```

**Important:** Do not add `@justinmiehle/reporter-vitest` or `@justinmiehle/shared` to `ssr.noExternal` in your Vite/Vitest config. The packages are designed to be treated as external dependencies and will be loaded from their compiled JavaScript files in the `dist/` directory.

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
