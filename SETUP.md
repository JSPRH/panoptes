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

1. Install the reporter:
   ```bash
   bun add -d @panoptes/reporter-vitest
   ```

2. Configure in `vitest.config.ts`:
   ```typescript
   import PanoptesReporter from '@panoptes/reporter-vitest'
   
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

1. Install the reporter:
   ```bash
   bun add -d @panoptes/reporter-playwright
   ```

2. Configure in `playwright.config.ts`:
   ```typescript
   import PanoptesReporter from '@panoptes/reporter-playwright'
   
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
