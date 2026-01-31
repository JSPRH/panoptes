# Panoptes CLI

Command-line tool for ingesting test results into Panoptes.

## Installation

```bash
bun add -d @panoptes/cli
```

## Usage

### Ingest Test Results

```bash
panoptes ingest -f test-results.json -c https://your-deployment.convex.cloud -p my-project
```

### Options

- `-f, --file <path>` - Path to test results JSON file (required)
- `-c, --convex-url <url>` - Convex URL (required, or set `CONVEX_URL` environment variable)
- `-p, --project <name>` - Project name (default: `default-project` or `PANOPTES_PROJECT_NAME`)

## Test Results Format

The JSON file should match the `TestRunIngest` schema:

```json
{
  "projectName": "my-project",
  "framework": "vitest",
  "testType": "unit",
  "startedAt": 1234567890,
  "completedAt": 1234567890,
  "duration": 5000,
  "totalTests": 10,
  "passedTests": 8,
  "failedTests": 1,
  "skippedTests": 1,
  "tests": [
    {
      "name": "test example",
      "file": "src/example.test.ts",
      "status": "passed",
      "duration": 100
    }
  ]
}
```
