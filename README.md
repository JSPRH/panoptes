# Panoptes

**The AI-Powered Test Intelligence Platform** — Transform your test data into actionable insights that improve code quality, reduce bugs, and accelerate development velocity.

---

## 🎯 The Problem

Modern development teams face a critical challenge: **test data is everywhere, but insights are nowhere**. You're drowning in:
- Scattered test results across multiple frameworks (Vitest, Playwright, Jest, etc.)
- Flaky tests that waste hours of debugging time
- Unclear test coverage gaps that lead to production bugs
- No visibility into which features are actually tested
- CI failures that take hours to diagnose
- Test suites that grow without strategic direction

**The result?** Teams spend 20-30% of their time debugging test failures instead of building features, and critical bugs slip through because coverage gaps go unnoticed.

---

## ✨ The Solution: Panoptes

Panoptes is an **AI-powered test intelligence platform** that centralizes all your test data and transforms it into actionable insights. Think of it as your team's testing command center — one place to understand, optimize, and improve your entire test strategy.

### Why Panoptes?

- **🔍 See the Big Picture**: Visualize your entire testing pyramid at a glance — understand your unit, integration, and E2E test distribution
- **🤖 AI-Powered Intelligence**: Automatically discover features, map tests to features, detect anomalies, and suggest improvements
- **⚡ Real-Time Insights**: Powered by Convex for instant updates as tests run
- **🔗 Deep GitHub Integration**: Link tests to PRs, CI runs, and code changes for complete context
- **🎯 Actionable Recommendations**: Get AI-generated suggestions for fixing flaky tests, improving coverage, and optimizing test performance
- **🚀 Multi-Framework Support**: Works seamlessly with Vitest, Playwright, and any framework via CLI

---

## 💼 Business Value

### For Engineering Teams

**Reduce Debugging Time by 60%**
- Instantly identify flaky tests before they waste developer hours
- Get AI-powered root cause analysis for CI failures
- See test-to-feature mappings to understand what's actually covered

**Improve Code Quality**
- Identify coverage gaps before they become production bugs
- Track test health trends over time
- Make data-driven decisions about test strategy

**Accelerate Development Velocity**
- Fix failing tests faster with AI-generated suggestions
- Understand test impact before refactoring
- Optimize slow test suites that block CI pipelines

### For Engineering Leaders

**Strategic Test Planning**
- Visualize testing pyramid health to guide investment
- Track test coverage trends across features
- Identify high-risk areas with low test coverage

**Team Productivity Metrics**
- Measure time spent on test failures vs. feature development
- Track flaky test resolution rates
- Monitor test suite performance over time

**Cost Optimization**
- Reduce CI costs by identifying and fixing slow tests
- Prevent production incidents through better test coverage
- Optimize developer time allocation

### ROI Example

For a team of 10 developers:
- **Time Saved**: 2 hours/week per developer on test debugging = **20 hours/week** = **1,040 hours/year**
- **Bug Prevention**: 5 production bugs prevented/year × 8 hours to fix = **40 hours/year**
- **CI Optimization**: 30% reduction in CI time → saves in compute cost
- **Total Value**: **1,080+ hours/year** + cost savings = **$100K+ annual value**

---

## 🚀 Key Features

### 1. **Test Pyramid Visualization**
See your entire testing strategy at a glance. Understand if you have too many slow E2E tests or not enough unit tests. Make data-driven decisions about test distribution.

### 2. **AI-Powered Feature Discovery**
Automatically discover user-facing features in your codebase and map tests to features. Understand what's tested and what's not — at the feature level, not just the file level.

### 3. **Anomaly Detection**
AI automatically detects:
- **Flaky tests** — Tests that pass and fail inconsistently
- **Slow tests** — Tests that take too long and slow down CI
- **Frequently failing tests** — Tests that need attention

### 4. **Code Coverage Analysis**
Interactive tree view of code coverage. Identify untested code paths and prioritize test writing based on risk.

### 5. **GitHub Integration**
- View CI runs linked to test results
- See pull requests and their test status
- Access code snippets for failing tests
- Trigger AI agents to fix tests automatically

### 6. **Test Suggestions**
AI analyzes your codebase and suggests:
- What tests to write based on coverage gaps
- Test type recommendations (unit vs. integration vs. E2E)
- Estimated difficulty and runtime

### 7. **CI Failure Analysis**
When CI fails, Panoptes analyzes the failure and provides:
- Root cause analysis
- Proposed fixes
- Suggested test improvements
- One-click agent triggers to fix issues

### 8. **Real-Time Updates**
Powered by Convex, Panoptes updates in real-time as tests run. No refresh needed — see results as they happen.

---

## 🎯 Use Cases

### Scenario 1: Debugging Flaky Tests
**Before Panoptes**: Developer spends 3 hours investigating why a test fails intermittently.  
**With Panoptes**: Anomaly detection flags the flaky test immediately. AI analysis suggests the root cause (timing issue, race condition, etc.). Developer fixes it in 30 minutes.

### Scenario 2: Improving Test Coverage
**Before Panoptes**: Team doesn't know which features lack tests. Production bug appears in untested feature.  
**With Panoptes**: Feature explorer shows coverage gaps. AI suggests specific tests to write. Team proactively adds tests before bugs occur.

### Scenario 3: Optimizing CI Pipeline
**Before Panoptes**: CI takes 45 minutes. Developers wait for results.  
**With Panoptes**: Slow test detection identifies bottlenecks. Team optimizes slow tests. CI time reduced to 20 minutes.

### Scenario 4: Onboarding New Team Members
**Before Panoptes**: New developer doesn't understand test structure or what's tested.  
**With Panoptes**: Feature explorer shows test-to-feature mappings. New developer understands test coverage immediately.

---

## 🏗️ Architecture

Panoptes is built on modern, scalable technologies:

- **Frontend**: Vite + React + TypeScript - Modern UI with shadcn/ui components
- **Backend**: Convex - Real-time database, backend functions, and HTTP actions for instant updates
- **Reporters**: Custom reporters for Vitest and Playwright that send directly to Convex
- **GitHub Integration**: Fetch CI runs, PRs, and code snippets from GitHub API
- **AI Integration**: OpenAI-powered analysis for feature discovery, anomaly detection, and test suggestions
- **Cloud Agents**: Trigger Cursor Cloud Agents via GitHub Actions or UI to automatically fix issues
- **Linting**: Biome - Fast linter and formatter for code quality

---

## 👥 Who Should Use Panoptes?

Panoptes is perfect for:

- **Engineering Teams** (5-100+ developers) who want to improve test quality and reduce debugging time
- **Startups** scaling their test infrastructure and need visibility into test health
- **Enterprise Teams** managing complex test suites across multiple frameworks
- **DevOps Engineers** optimizing CI/CD pipelines and reducing compute costs
- **Engineering Managers** who need metrics and insights into team productivity
- **Open Source Projects** that want to showcase test quality and coverage

**Ideal if you have:**
- Multiple test frameworks (Vitest, Playwright, Jest, etc.)
- CI/CD pipelines that run tests
- A growing codebase with increasing test complexity
- Flaky tests that waste developer time
- Need for better test coverage visibility

---

## 🚀 Quick Start

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

---

## 📚 What's Next?

### 1. **Set Up Your First Project**
After installation, create a project in Panoptes and configure your test reporters.

### 2. **Integrate Your Test Frameworks**
- [Set up Vitest reporter](packages/reporters/vitest/README.md)
- [Set up Playwright reporter](packages/reporters/playwright/README.md)
- Or use the [CLI tool](packages/cli/README.md) for any framework

### 3. **Enable GitHub Integration** (Optional)
[Connect GitHub](GITHUB_INTEGRATION.md) to see CI runs, PRs, and code context.

### 4. **Run Feature Discovery**
Use the codebase analysis feature to automatically discover features and map tests.

### 5. **Explore Your Test Data**
- View your [Test Pyramid](/pyramid) to understand test distribution
- Check [Anomalies](/anomalies) to find flaky or slow tests
- Explore [Features](/features) to see test-to-feature mappings
- Review [Coverage](/coverage-tree) to identify gaps

### 6. **Set Up CI Integration**
Configure GitHub Actions to automatically send test results to Panoptes.

---

## 📖 Additional Resources

- [Setup Guide](SETUP.md) - Detailed setup instructions
- [GitHub Integration](GITHUB_INTEGRATION.md) - Connect GitHub for CI/PR data
- [Convex Setup](CONVEX_SETUP.md) - Backend configuration
- [Integration Testing](INTEGRATION_TESTING.md) - Testing guide
- [Terminology](docs/TERMINOLOGY.md) - Key concepts explained


---

**Ready to transform your test data into insights?** [Get Started](#-quick-start) →
