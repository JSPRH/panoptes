# Panoptes Setup Guide

## Initial Setup

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Set up Convex**:
   ```bash
   bun run dev:convex
   ```
   Or from the `convex` directory:
   ```bash
   cd convex
   bun run dev
   ```
   
   **Note**: Use `bun run dev` (not `bunx convex dev`) to avoid bundling issues with Bun.
   
   This will:
   - Prompt you to login/create a Convex account (if first time)
   - Create a new project or connect to existing one
   - Generate `convex/.env.local` file with your `CONVEX_URL`
   - Start the Convex dev server (keep this running!)
   - Generate TypeScript types in `convex/_generated/`

3. **Configure environment variables**:
   
   After `convex dev` starts, copy the `CONVEX_URL` from `convex/.env.local`:
   
   Create `.env` in the root:
   ```bash
   CONVEX_URL=https://xxxxx.convex.cloud  # Copy from convex/.env.local
   PANOPTES_PROJECT_NAME=my-project
   NODE_ENV=development
   ```

   Create `apps/web/.env`:
   ```bash
   VITE_CONVEX_URL=https://xxxxx.convex.cloud  # Same URL from convex/.env.local
   ```

4. **Configure GitHub Integration (Optional)**:
   
   To enable GitHub integration (CI runs, PRs, code snippets):
   
   a. Create a GitHub Personal Access Token with `repo` and `actions:read` permissions
   
   b. Add it to Convex secrets:
      - Go to Convex Dashboard → Settings → Environment Variables
      - Add secret: `GITHUB_ACCESS_TOKEN_STORYBOOK`
      - Paste your GitHub token
   
   c. Configure project repository:
      - In Panoptes UI, set the repository URL for your project
      - Format: `https://github.com/owner/repo` or `owner/repo`
   
   See [GITHUB_INTEGRATION.md](GITHUB_INTEGRATION.md) for detailed instructions.
   
   **Important**: Keep `bun run dev:convex` (or `bun run dev` from the convex directory) running in a terminal - it watches for changes and generates types.

4. **Start the frontend**:
   ```bash
   bun run dev:web
   ```
   The frontend will run on http://localhost:5173

## Using Reporters

### Vitest Reporter

1. Install the reporter (from GitHub Packages; see [Publishing report packages](#publishing-reporter-packages) for auth):
   ```bash
   bun add -d @justinmiehle/reporter-vitest
   ```

2. Configure in `vitest.config.ts`:
   ```typescript
   import PanoptesReporter from '@justinmiehle/reporter-vitest'
   
   export default defineConfig({
     test: {
       reporters: [
         'default',
         [PanoptesReporter, {
           convexUrl: process.env.CONVEX_URL,
           projectName: 'my-project',
         }],
       ],
     },
   })
   ```

3. Run tests:
   ```bash
   vitest run
   ```

### Playwright Reporter

1. Install the reporter (from GitHub Packages; see [Publishing reporter packages](#publishing-reporter-packages) for auth):
   ```bash
   bun add -d @justinmiehle/reporter-playwright
   ```

2. Configure in `playwright.config.ts`:
   ```typescript
   import PanoptesReporter from '@justinmiehle/reporter-playwright'
   
   export default defineConfig({
     reporter: [
       ['list'],
       [PanoptesReporter, {
         convexUrl: process.env.CONVEX_URL,
         projectName: 'my-project',
       }],
     ],
   })
   ```

3. Run tests:
   ```bash
   playwright test
   ```

## Publishing reporter packages

The reporters and shared types are published to [GitHub Packages](https://github.com/JustinMiehle?tab=packages) under the `@justinmiehle` scope:

- `@justinmiehle/shared` (required by both reporters)
- `@justinmiehle/reporter-playwright`
- `@justinmiehle/reporter-vitest`

### Publishing (manual)

1. **Auth**: Create a [Personal Access Token](https://github.com/settings/tokens) with `write:packages` and `read:packages`. Then:
   ```bash
   echo "//npm.pkg.github.com/:_authToken=YOUR_TOKEN" >> ~/.npmrc
   ```
   Or set `NODE_AUTH_TOKEN` when running publish.

2. **Build and publish** (order matters; shared first):
   ```bash
   bun run build:shared
   bun run --cwd packages/shared publish
   bun run --cwd packages/reporters/playwright build && bun run --cwd packages/reporters/playwright publish
   bun run --cwd packages/reporters/vitest build && bun run --cwd packages/reporters/vitest publish
   ```
   Or use the workflow below.

### Making packages public (one-time)

GitHub Packages **defaults personal-account packages to private**. Even with `npm publish --access public`, you must set visibility in the GitHub UI once per package:

1. Open [your Packages tab](https://github.com/JustinMiehle?tab=packages).
2. Click each package: **shared**, **reporter-playwright**, **reporter-vitest**.
3. On the package page, click **Package settings** (right side).
4. Scroll to **Danger Zone** → **Change visibility** → choose **Public** → confirm.

After that, anyone can install the packages (with `.npmrc` and auth as described below). You cannot change a package back to private after making it public.

### Using in another GitHub Action

In the repo that uses the reporters, add before installing dependencies:

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

Add an `.npmrc` in that repo (or a step that writes it):

```
@justinmiehle:registry=https://npm.pkg.github.com
```

Then add `@justinmiehle/reporter-playwright` or `@justinmiehle/reporter-vitest` to that repo’s dependencies and use the reporter in your test config.

## Troubleshooting

### Convex types not found

Run `bun run dev:convex` (or `bun run dev` from the convex directory) to generate types.

### Test results not appearing

Make sure:
1. Convex dev server is running (`bun run dev:convex`)
2. `CONVEX_URL` is set in your environment (for reporters) or `.env` file
3. The URL format is correct (should be `https://xxx.convex.cloud`)

### Frontend shows no data

1. Make sure Convex is running and types are generated
2. Check that `VITE_CONVEX_URL` is set in `apps/web/.env`
3. Verify test reporters are configured with the correct `CONVEX_URL`
4. Check browser console for errors

### GitHub integration not working

1. Verify `GITHUB_ACCESS_TOKEN_STORYBOOK` is set in Convex secrets
2. Check that project has a repository URL configured
3. Ensure token has correct permissions (`repo`, `actions:read`)
4. Try clicking "Sync GitHub Data" button on CI Runs or Pull Requests page
5. Check browser console for API errors

See [GITHUB_INTEGRATION.md](GITHUB_INTEGRATION.md) for troubleshooting.
