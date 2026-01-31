# Panoptes Setup Guide

## Initial Setup

1. **Install dependencies**:
   ```bash
   bun install
   ```

2. **Set up Convex**:
   ```bash
   cd convex
   bunx convex dev
   ```
   
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
   PANOPTES_API_URL=http://localhost:3001
   PANOPTES_PROJECT_NAME=my-project
   NODE_ENV=development
   ```

   Create `apps/web/.env`:
   ```bash
   VITE_CONVEX_URL=https://xxxxx.convex.cloud  # Same URL from convex/.env.local
   ```
   
   **Important**: Keep `bunx convex dev` running in a terminal - it watches for changes and generates types.

4. **Start the API server** (in one terminal):
   ```bash
   bun run dev:api
   ```
   The API will run on http://localhost:3001

5. **Start the frontend** (in another terminal):
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
           apiUrl: 'http://localhost:3001',
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
         apiUrl: 'http://localhost:3001',
         projectName: 'my-project',
       }],
     ],
   })
   ```

3. Run tests:
   ```bash
   playwright test
   ```

## API Endpoints

- `POST /api/v1/tests/ingest` - Ingest test results
- `GET /api/v1/tests` - Query tests
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create/update project
- `GET /health` - Health check
- `GET /swagger` - API documentation

## Troubleshooting

### Convex types not found

Run `bunx convex dev` in the `convex` directory to generate types.

### API can't connect to Convex

Make sure:
1. Convex dev server is running (`bunx convex dev`)
2. `CONVEX_URL` is set in `.env`
3. The URL format is correct (should be `https://xxx.convex.cloud`)

### Frontend shows no data

1. Make sure Convex is running and types are generated
2. Check that `VITE_CONVEX_URL` is set in `apps/web/.env`
3. Verify the API is running and receiving test data
4. Check browser console for errors
