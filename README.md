# Panoptes

A test visualization platform that ingests test results from multiple frameworks and provides insights into your testing pyramid.

## Architecture

- **Backend API**: Elysia (Bun) - REST API for test ingestion
- **Frontend**: Vite + React + TypeScript - Modern UI with shadcn/ui
- **Database**: Convex - Real-time database and backend functions
- **Reporters**: Custom reporters for Vitest and Playwright
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
   cd convex
   bunx convex dev
   ```
   This will create a `.env` file with your `CONVEX_URL`.

2. **Configure environment variables**:
   - Copy `.env.example` to `.env` and fill in your Convex URL
   - Copy `apps/web/.env.example` to `apps/web/.env` and add your Convex URL

3. **Start the API server**:
   ```bash
   bun run dev:api
   ```

4. **Start the frontend**:
   ```bash
   bun run dev:web
   ```

### Development

```bash
# Run all apps
bun run dev

# Run specific app
bun run dev:api
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
bun run src/index.ts ingest -f test-results.json -p my-project
```

## Project Structure

```
panoptes/
├── apps/
│   ├── api/              # Elysia backend API
│   └── web/              # Vite + React frontend
├── packages/
│   ├── reporters/        # Test reporters
│   ├── cli/              # CLI tool
│   └── shared/           # Shared types and utilities
└── convex/               # Convex schema and functions
```

## Code Quality

This project uses:
- **Biome** for linting and formatting (configured in `biome.json`)
- **TypeScript** for type safety
- **GitHub Actions** for CI/CD (see `.github/workflows/ci.yml`)

Run `bun run ci` to verify all checks pass locally before pushing.
