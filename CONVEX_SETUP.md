# Convex Local Setup Guide

## Quick Start

1. **Navigate to the convex directory**:
   ```bash
   cd convex
   ```

2. **Start Convex dev server**:
   ```bash
   bunx convex dev
   ```

   This will:
   - Prompt you to login/create account (if first time)
   - Create a new project or use existing one
   - Generate `.env.local` file with your `CONVEX_URL`
   - Start watching for changes and generate types

3. **Copy the CONVEX_URL** from `convex/.env.local`:
   ```bash
   # After convex dev starts, you'll see something like:
   # CONVEX_URL=https://xxxxx.convex.cloud
   ```

4. **Create/update `.env` in the root**:
   ```bash
   # In the root directory
   CONVEX_URL=https://xxxxx.convex.cloud  # Copy from convex/.env.local
   PANOPTES_PROJECT_NAME=my-project
   NODE_ENV=development
   ```

5. **Create/update `apps/web/.env`**:
   ```bash
   # In apps/web directory
   VITE_CONVEX_URL=https://xxxxx.convex.cloud  # Same URL from convex/.env.local
   ```

## Important Notes

- **Keep `bunx convex dev` running** - This watches for schema changes and generates TypeScript types
- The `convex/_generated/` folder is created automatically - don't edit it manually
- If you see import errors for `convex/_generated/api`, make sure `convex dev` is running
- The `.env.local` file in `convex/` is automatically created - don't commit it

## Troubleshooting

### "Cannot find module convex/_generated/api"

This means Convex hasn't generated the types yet. Run:
```bash
cd convex
bunx convex dev
```

Wait for it to finish initializing and generating types.

### "CONVEX_URL not set"

Make sure you've:
1. Run `bunx convex dev` in the `convex/` directory
2. Copied the `CONVEX_URL` from `convex/.env.local` to:
   - Root `.env` file
   - `apps/web/.env` file (as `VITE_CONVEX_URL`)

### Convex dev won't start

Make sure you're in the `convex/` directory and have run `bun install` in the root first.
