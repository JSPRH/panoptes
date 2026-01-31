# Panoptes Vitest Reporter

Custom reporter for Vitest that sends test results directly to Convex.

## Installation

### Within the Panoptes Monorepo

If you're using this reporter in another package within the Panoptes monorepo, use the workspace protocol:

```bash
bun add -d @panoptes/reporter-vitest@workspace:*
```

This will reference the local package directly without needing to publish to NPM or use a local registry.

### Outside the Monorepo

If you want to use this reporter in a project outside the monorepo, you have a few options:

1. **Use a local file path** (recommended for local development):

   Since this reporter depends on `@panoptes/shared`, you'll need to install both packages using file paths. **Important: You must build the packages before using them.**

   **Step 1: Build the packages**

   First, build both packages in the Panoptes monorepo:

   ```bash
   cd /path/to/panoptes
   cd packages/shared && bun run build && cd ..
   cd packages/reporters/vitest && bun run build && cd ../..
   ```

   **Step 2: Install in your project**

   **For Bun users:**

   ```bash
   # Replace /path/to/panoptes with the actual path to your Panoptes repo
   bun add -d @panoptes/shared@file:/path/to/panoptes/packages/shared
   bun add -d @panoptes/reporter-vitest@file:/path/to/panoptes/packages/reporters/vitest
   ```

   **For Yarn users (e.g., Storybook repo):**

   If your Panoptes repo and Storybook are in the same folder:

   ```bash
   cd storybook
   yarn add -D @panoptes/shared@file:../panoptes/packages/shared
   yarn add -D @panoptes/reporter-vitest@file:../panoptes/packages/reporters/vitest
   ```

   **Important notes:**
   - The packages export compiled JavaScript from the `dist/` directory, not TypeScript source
   - You must rebuild the packages whenever you make changes to the source code
   - Yarn will automatically resolve the `workspace:*` dependency in the reporter's `package.json` to the file path you provide for `@panoptes/shared`
   - If you reinstall dependencies in your project, you may need to rebuild the Panoptes packages

2. **Publish to NPM** (if the package is made public):

   ```bash
   bun add -d @panoptes/reporter-vitest
   ```

3. **Use a local package registry** (like Verdaccio):

   ```bash
   # Configure your registry, then:
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

**Important:** Do not add `@panoptes/reporter-vitest` or `@panoptes/shared` to `ssr.noExternal` in your Vite/Vitest config. The packages are designed to be treated as external dependencies and will be loaded from their compiled JavaScript files in the `dist/` directory.

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
