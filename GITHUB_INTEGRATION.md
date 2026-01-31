# GitHub Integration Guide

Panoptes integrates with GitHub to enrich test coverage data with CI runs, pull requests, code snippets, and cloud agent triggers.

## Features

- **CI Runs**: View GitHub Actions workflow runs linked to your test runs
- **Pull Requests**: See open PRs and their associated test runs
- **Code Snippets**: View code context for failing tests directly in the UI
- **Commit Linking**: Test runs are automatically linked to git commits
- **Cloud Agents**: Trigger Cursor Cloud Agents to fix failing tests

## Setup

### 1. Configure GitHub Access Token

You need a GitHub Personal Access Token (PAT) with the following permissions:
- `repo` (Full control of private repositories) - for private repos
- `public_repo` (Access public repositories) - for public repos
- `actions:read` (Read GitHub Actions data)

**Create a token:**
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Name it (e.g., "Panoptes Integration")
4. Select the required scopes
5. Generate and copy the token

**Add token to Convex:**
1. Go to your Convex dashboard
2. Navigate to Settings → Environment Variables
3. Add a new secret: `GITHUB_ACCESS_TOKEN_STORYBOOK`
4. Paste your GitHub token as the value
5. Save

### 2. Configure Project Repository

For each project in Panoptes, you need to set the repository URL:

1. In the Panoptes UI, go to your project settings
2. Add the repository URL in one of these formats:
   - `https://github.com/owner/repo`
   - `git@github.com:owner/repo.git`
   - `owner/repo`

The repository URL is stored in the `projects` table's `repository` field.

### 3. Sync GitHub Data

Once configured, you can sync GitHub data:

1. Go to the **CI Runs** or **Pull Requests** page
2. Select your project
3. Click **"Sync GitHub Data"** button
4. Wait for the sync to complete

Data is cached in the database, so you don't need to sync constantly. Sync when you want to refresh the data.

## Using GitHub Integration

### Viewing CI Runs

1. Navigate to **CI Runs** page
2. Select a project with a configured repository
3. View workflow runs with their status, branch, and commit information
4. Click "View on GitHub" to see the full run details

### Viewing Pull Requests

1. Navigate to **Pull Requests** page
2. Select a project with a configured repository
3. See all open PRs with their authors, branches, and status
4. Click "View on GitHub" to open the PR

### Viewing Code Snippets

1. Go to **Test Explorer**
2. Find a test with a file path and line number
3. Click **"View Code"** button
4. See the code snippet with syntax highlighting
5. The target line is highlighted in yellow

### Linking Test Runs to Commits

Test runs are automatically linked to commits when:
- Running in CI environments (GitHub Actions, CircleCI, GitLab CI)
- The `GITHUB_SHA`, `CIRCLE_SHA1`, or `GITLAB_CI_COMMIT_SHA` environment variable is set
- Running locally with git available (uses `git rev-parse HEAD`)

The commit SHA is stored in the `testRuns` table and can be used to:
- Link test runs to CI runs
- View code at specific commits
- Track test history across commits

## Cursor Cloud Agents

Panoptes supports triggering Cursor Cloud Agents to automatically fix failing tests.

### Option 1: GitHub Action (Recommended)

Add the workflow to your repository:

1. Copy `.github/workflows/cursor-cloud-agent.yml` to your repository
2. Add `CURSOR_API_KEY` to your repository secrets (if required by Cursor)
3. Go to Actions → "Trigger Cursor Cloud Agent"
4. Click "Run workflow"
5. Enter a prompt describing what you want the agent to do
6. The agent will run and create a PR with fixes

**Example prompt:**
```
Fix the failing test "should calculate total correctly" in convex/tests.ts at line 42. Error: AssertionError: expected 5 to equal 6
```

### Option 2: Cursor CLI

Use the Cursor CLI directly:

```bash
# Install Cursor CLI
curl https://cursor.com/install -fsS | bash

# Trigger agent
agent -p "Fix the failing test in tests.ts" --non-interactive
```

### Option 3: UI Integration

In the Test Explorer:
1. Find a failing test
2. Click **"Trigger Cloud Agent"** button
3. Follow the instructions shown

Note: Direct API integration requires Cursor API access. The GitHub Action approach is more reliable.

## Troubleshooting

### "GITHUB_ACCESS_TOKEN_STORYBOOK not configured"

Make sure you've added the token to Convex secrets:
1. Go to Convex dashboard → Settings → Environment Variables
2. Verify `GITHUB_ACCESS_TOKEN_STORYBOOK` exists
3. Check that the token value is correct

### "Project repository not configured"

Add the repository URL to your project:
1. The repository field should be set in the `projects` table
2. Use format: `https://github.com/owner/repo` or `owner/repo`

### "GitHub API error: 404"

This usually means:
- The repository doesn't exist
- The token doesn't have access to the repository
- The repository URL format is incorrect

Check:
- Repository URL is correct
- Token has `repo` scope for private repos or `public_repo` for public repos
- Token hasn't expired

### "No CI runs found"

- Make sure GitHub Actions workflows exist in your repository
- Click "Sync GitHub Data" to fetch runs
- Check that the repository URL is configured correctly

### Code snippets not loading

- Verify the file path is correct
- Check that the file exists in the repository
- Ensure the commit SHA is valid (if using a specific commit)
- Make sure the token has read access to the repository

## Rate Limiting

GitHub API has rate limits:
- **Authenticated requests**: 5,000 requests/hour
- **Unauthenticated requests**: 60 requests/hour

Panoptes caches data in the database to minimize API calls. Sync only when needed.

## Security Considerations

- **Never commit tokens**: Store `GITHUB_ACCESS_TOKEN_STORYBOOK` only in Convex secrets
- **Use minimal permissions**: Only grant the minimum required scopes
- **Rotate tokens regularly**: Update tokens periodically for security
- **Review access**: Regularly review which repositories the token can access

## Future Enhancements

- Webhook integration for real-time updates
- PR comment integration (post test results as PR comments)
- Commit status integration (update GitHub commit statuses)
- Multi-repository support per project
- GitHub App installation for better permissions
