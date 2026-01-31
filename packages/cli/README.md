# Panoptes CLI

Command-line tool for ingesting test results into Panoptes.

## Installation

```bash
bun add -d @panoptes/cli
```

## Usage

### Ingest Test Results

```bash
panoptes ingest -f test-results.json -p my-project
```

### Options

- `-f, --file <path>` - Path to test results JSON file (required)
- `-a, --api-url <url>` - API URL (default: `http://localhost:3001` or `PANOPTES_API_URL`)
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
