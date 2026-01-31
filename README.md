# Panoptes

A test visualization platform that ingests test results from multiple frameworks and provides insights into your testing pyramid.

## Architecture

- **Frontend**: Vite + React + TypeScript - Modern UI with shadcn/ui
- **Backend**: Convex - Real-time database, backend functions, and HTTP actions
- **Reporters**: Custom reporters for Vitest and Playwright that send directly to Convex
- **GitHub Integration**: Fetch CI runs, PRs, and code snippets from GitHub
- **Cloud Agents**: Trigger Cursor Cloud Agents via GitHub Actions or UI
- **Linting**: Biome - Fast linter and formatter

## Getting Started

### Prerequisites

- Bun >= 1.0.0
- Convex account (for database)

### Installation

```bash
bun install
```

### Setup

1. **Set up Convex**:
   ```bash
   bun run dev:convex
   ```
   Or from the `convex` directory:
   ```bash
   cd convex
   bun run dev
   ```
   This will create a `.env` file with your `CONVEX_URL`.
   
   **Note**: Use `bun run dev` (not `bunx convex dev`) to avoid bundling issues with Bun.

2. **Configure environment variables**:
   - Copy `.env.example` to `.env` and fill in your Convex URL
   - Copy `apps/web/.env.example` to `apps/web/.env` and add your Convex URL

3. **Start the frontend**:
   ```bash
   bun run dev:web
   ```

### Development

```bash
# Run the frontend
bun run dev
# or
bun run dev:web

# Lint code
bun run lint

# Format code
bun run format

# Type check
bun run typecheck

# Run tests
bun test

# Run all CI checks locally
bun run ci
```

## Using the Reporters

### Vitest Reporter

See [packages/reporters/vitest/README.md](packages/reporters/vitest/README.md)

### Playwright Reporter

See [packages/reporters/playwright/README.md](packages/reporters/playwright/README.md)

### CLI Tool

```bash
cd packages/cli
bun run build
bun run src/index.ts ingest -f test-results.json -c https://your-deployment.convex.cloud -p my-project
```

## GitHub Integration

Panoptes can integrate with GitHub to:
- View CI runs from GitHub Actions
- Display open pull requests
- Show code snippets for tests
- Link test runs to commits
- Trigger Cursor Cloud Agents

See [GITHUB_INTEGRATION.md](GITHUB_INTEGRATION.md) for detailed setup instructions.

## Project Structure

```
panoptes/
├── apps/
│   └── web/              # Vite + React frontend
├── packages/
│   ├── reporters/        # Test reporters (send directly to Convex)
│   ├── cli/              # CLI tool (sends directly to Convex)
│   └── shared/           # Shared types and utilities
└── convex/               # Convex schema, functions, and HTTP actions
```

## Deployment

### Vercel

1. **Connect your repository** to Vercel (via GitHub/GitLab/Bitbucket)

2. **Configure the project**:
   - Root directory: `apps/web`
   - Build command: `bun run build`
   - Output directory: `dist`
   - Install command: `bun install` (from root)

3. **Set environment variables** in Vercel:
   - Go to your project → Settings → Environment Variables
   - Add `VITE_CONVEX_URL` with your production Convex URL (e.g., `https://xxxxx.convex.cloud`)
   - Make sure to set it for **Production** environment (and Preview if needed)

4. **Deploy**: Vercel will automatically deploy on every push to your main branch

**Important**: The app will show a configuration error screen if `VITE_CONVEX_URL` is not set in production. Make sure to add this environment variable before deploying.

## Code Quality

This project uses:
- **Biome** for linting and formatting (configured in `biome.json`)
- **TypeScript** for type safety
- **GitHub Actions** for CI/CD (see `.github/workflows/ci.yml`)

Run `bun run ci` to verify all checks pass locally before pushing.
