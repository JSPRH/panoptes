# Agent Best Practices for Panoptes

This document outlines best practices for AI agents working on this codebase. Follow these guidelines to maintain code quality, documentation, and project consistency.

## Package Manager

**ALWAYS use Bun, never pnpm, npm, or yarn.**

- Install dependencies: `bun install` or `bun add <package>`
- Run scripts: `bun run <script>`
- Execute binaries: `bunx <command>`
- Workspace commands: `bun run --cwd <workspace> <command>`

## Documentation Standards

### Keep Documentation Up-to-Date

1. **When adding features**: Update relevant README files immediately
2. **When changing APIs**: Update API documentation and examples
3. **When modifying setup**: Update SETUP.md with new steps
4. **When adding dependencies**: Update package.json and document why

### Documentation Files

- `README.md` - Main project overview and quick start
- `SETUP.md` - Detailed setup instructions
- `AGENTS.md` - This file (agent guidelines)
- `packages/*/README.md` - Package-specific documentation
- Inline code comments for complex logic

### Writing Good Documentation

- Use clear, concise language
- Include code examples for all features
- Keep examples up-to-date with actual code
- Document environment variables and configuration options
- Include troubleshooting sections for common issues
- Use proper markdown formatting

## Code Quality

### Linting and Formatting

**We use Biome for linting and formatting. Never use ESLint or Prettier.**

- Run linting: `bun run lint`
- Auto-fix linting issues: `bun run lint:fix`
- Format code: `bun run format`
- Biome config is in `biome.json` - use default rules unless there's a specific reason to change
- Always run `bun run lint` before committing
- The CI pipeline will fail if linting fails

### TypeScript

- Use strict TypeScript settings
- Prefer type inference where possible
- Export types from shared packages
- Use Zod for runtime validation
- Avoid `any` - use `unknown` or proper types
- Run type checking: `bun run typecheck`

### Code Organization

- Follow the existing project structure
- Keep related code together (feature-based organization)
- Use consistent naming conventions
- Separate concerns (controllers, services, models)
- Keep functions small and focused

### Error Handling

- Always handle errors gracefully
- Provide meaningful error messages
- Log errors appropriately
- Don't swallow errors silently

## Testing

- Write tests for new features
- Keep test files alongside source files
- Use descriptive test names
- Test edge cases and error conditions
- Update tests when modifying functionality
- Run tests with `bun test`
- CI will run tests automatically on push/PR

## Git Practices

### Atomic Commits

**CRITICAL: Always make atomic commits** - each commit must represent a single, complete, logical change.

**MANDATORY RULES:**
- **One logical change per commit** - Never mix unrelated changes in a single commit
- **Complete and working** - Each commit must leave the codebase in a working state (builds, tests pass)
- **Focused scope** - If a change touches multiple areas, split into multiple commits
- **Testable** - Each commit must be independently testable
- **Self-contained** - Each commit should make sense on its own when reviewed
- **No "fixup" commits** - Fix issues in the original commit or create a proper follow-up commit

**When to split commits:**
- Fixing bugs vs. adding features → separate commits
- Code changes vs. documentation updates → separate commits (unless docs are part of the feature)
- Infrastructure changes (CI, hooks, config) vs. code changes → separate commits
- Multiple unrelated bug fixes → separate commits
- Refactoring vs. feature additions → separate commits

**Examples of good atomic commits:**
- `fix: remove unused React imports from Button and Header components`
- `fix: handle undefined projectId in getTestPyramidData query`
- `chore: add build check to pre-commit hook`
- `feat: add ConvexConfigError component for production deployment`
- `docs: add Vercel deployment instructions to README`

**Examples of bad commits (violate atomicity):**
- `fix: various bugs and add new features` ❌ (multiple unrelated changes)
- `fix: remove unused imports and add build check` ❌ (code fix + infrastructure change)
- `update: changed stuff` ❌ (unclear, too broad)
- `WIP: working on things` ❌ (incomplete, not atomic)

### Pre-commit Hooks

**Pre-commit hooks are automatically installed** when you run `bun install` (via the `prepare` script).

The pre-commit hook runs automatically before each commit and performs:
1. **Formatting** - Automatically formats code using Biome
2. **Linting** - Checks code for linting issues using Biome
3. **Testing** - Runs all tests to ensure nothing is broken

**IMPORTANT: Always ensure the pre-commit hook passes before committing.**

- The hook runs automatically - if it fails, the commit will be aborted
- Fix any issues (linting errors, test failures) before committing
- Run `bun run lint` and `bun test` manually if you want to check before committing
- Never use `--no-verify` to skip hooks unless absolutely necessary (and document why)

To manually install the hook: `bun run install-git-hooks`

To skip the hook (not recommended): `git commit --no-verify`

### Commit Messages

**Write clear, descriptive commit messages** that explain what and why.

Format:
```
<type>: <subject>

<optional body>

<optional footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Guidelines:
- Use imperative mood ("add" not "added" or "adds")
- Keep the subject line under 72 characters
- Capitalize the first letter of the subject
- Don't end the subject with a period
- Reference issues/PRs when applicable: `fix: resolve Vercel deployment issue (#123)`
- Use the body to explain the "why" if needed
- Group related changes in the same commit

Good examples:
- `feat: add error boundary for Convex configuration errors`
- `fix: prevent localhost URL usage in production builds`
- `docs: add Vercel deployment guide to README`

Bad examples:
- `update` ❌
- `fix stuff` ❌
- `WIP` ❌
- `asdf` ❌

### Making Commits

**MANDATORY: When making commits as an agent, you MUST:**

1. **Review changes**: Check `git status` and `git diff` to see what changed
2. **Group logically**: Ensure all staged files are part of the same logical change
3. **Stage selectively**: Use `git add <file1> <file2>` to stage only files for ONE atomic change
4. **Verify pre-commit hook**: The hook will run automatically, but you can verify with:
   - `bun run lint` - Check for linting issues
   - `bun test` - Run tests
   - `bun run typecheck` - Check TypeScript types
   - `bun run build` - Verify build succeeds
5. **Write commit message**: Use clear, descriptive messages following the format above
6. **Commit**: Run `git commit -m "your message"` - the pre-commit hook will run automatically
7. **If hook fails**: Fix the issues and try again. Never skip the hook.
8. **Repeat for other changes**: If you have multiple logical changes, make separate commits

**CRITICAL: Never commit multiple unrelated changes together. Always make separate commits.**

Example workflow for multiple changes:
```bash
# First change: Fix TypeScript errors
git add apps/web/src/stories/Button.tsx apps/web/src/stories/Header.tsx convex/tests.ts
git commit -m "fix: remove unused React imports and fix projectId type error"

# Second change: Add build check (separate commit!)
git add scripts/pre-commit
git commit -m "chore: add build check to pre-commit hook"
```

Bad example (violates atomicity):
```bash
# ❌ DON'T DO THIS - mixing unrelated changes
git add apps/web/src/stories/Button.tsx scripts/pre-commit
git commit -m "fix: various fixes"
```

### Branching

- Create feature branches for new work
- Keep branches focused on single features
- Rebase before merging when appropriate

## Environment Variables

- Document all environment variables in `.env.example`
- Never commit `.env` files
- Use environment variables for configuration
- Provide sensible defaults where possible
- Document required vs optional variables

## Dependencies

- Keep dependencies up-to-date
- Prefer smaller, focused packages
- Document why dependencies are added
- Remove unused dependencies
- Use workspace dependencies for internal packages

## Convex Integration

- Keep schema changes backward compatible when possible
- Document schema changes
- Update generated types after schema changes
- Use proper Convex patterns (queries, mutations, actions)
- Handle Convex errors appropriately

## API Design

- Follow RESTful conventions
- Use consistent endpoint naming
- Version APIs (`/api/v1/...`)
- Document endpoints with Swagger/OpenAPI
- Validate input data
- Return consistent response formats

## Frontend

- Use TypeScript for all components
- Follow React best practices
- Use shadcn/ui components when possible
- Keep components small and reusable
- Use proper state management
- Handle loading and error states

## Monorepo Management

- Use Bun workspaces for package management
- Keep shared code in `packages/shared`
- Avoid circular dependencies
- Use workspace protocol for internal packages (`workspace:*`)
- Keep package versions in sync when needed

## Performance

- Optimize database queries
- Use indexes appropriately
- Minimize bundle sizes
- Use code splitting where appropriate
- Profile and optimize bottlenecks

## Security

- Never commit secrets or API keys
- Validate and sanitize user input
- Use environment variables for sensitive data
- Keep dependencies updated for security patches
- Follow security best practices for APIs

## When Making Changes

1. **Read existing code** - Understand the current implementation
2. **Check documentation** - See if it needs updating
3. **Make changes** - Follow existing patterns
4. **Update docs** - Keep documentation in sync
5. **Test changes** - Verify everything works
6. **Update examples** - Ensure examples still work

## Common Tasks

### Adding a New Package

1. Create package directory in `packages/`
2. Add `package.json` with proper workspace config
3. Add to root `package.json` workspaces
4. Create README.md for the package
5. Update main README if needed

### Adding a New API Endpoint

1. Add route in appropriate module
2. Add validation schema
3. Implement service logic
4. Update Swagger documentation
5. Add error handling
6. Test the endpoint

### Adding a New UI Page

1. Create page component in `apps/web/src/pages/`
2. Add route in `App.tsx`
3. Add navigation link in `Layout.tsx`
4. Create necessary Convex queries/mutations
5. Add proper TypeScript types
6. Handle loading/error states

## CI/CD

- GitHub Actions runs on every push and PR
- CI checks: linting, type checking, tests, and build
- All checks must pass before merging
- Run `bun run ci` locally to verify everything passes
- The CI pipeline uses Bun and Biome

## Questions to Ask Yourself

Before committing changes:

- [ ] Is the documentation updated?
- [ ] Are examples still working?
- [ ] Are environment variables documented?
- [ ] Are TypeScript types correct?
- [ ] Is error handling appropriate?
- [ ] Are tests updated/added?
- [ ] Is the code following existing patterns?
- [ ] Are dependencies properly managed?
- [ ] Is the change backward compatible?
- [ ] Does `bun run lint` pass?
- [ ] Does `bun run typecheck` pass?
- [ ] Do tests pass?
- [ ] Will the pre-commit hook pass? (runs automatically, but good to check)

## Getting Help

- Check existing documentation first
- Look at similar implementations in the codebase
- Review recent commits for patterns
- Ask for clarification if requirements are unclear

## Remember

- **Documentation is code** - Keep it up-to-date
- **Consistency matters** - Follow existing patterns
- **User experience** - Make setup and usage clear
- **Maintainability** - Write code others can understand
- **Bun first** - Always use Bun, never other package managers
- **Biome for linting** - Use Biome, never ESLint or Prettier
- **CI must pass** - All checks must pass before merging
