# Test terminology

This document defines the core concepts used in Panoptes and how they map to the Convex schema.

## Test (test definition)

A **test** is one definition of one test case. It might be a unit test, integration test, end-to-end test, visual test, smoke test, or similar. A test is identified by its name, file, and location (e.g. line number).

- **Not stored as its own table.** A test is inferred as unique by `(projectId, testType, name, file, line)` across all test executions.
- **testType** comes from the test run that executed it (unit, integration, e2e, visual).

## Test execution

A **test execution** is one specific time that a given test was run. Each execution has a result: passed, failed, skipped, or running.

- **Schema:** One row in the `tests` table.
- Each row has a `testRunId` linking it to the test run that contained this execution.

## Test run

A **test run** is one batch of test executions. For example: "CI ran all unit tests in the project" is one test run. Multiple test executions belong to one test run.

- **Schema:** One row in the `testRuns` table.
- Many rows in `tests` reference it via `testRunId`.

## Summary

| Concept        | Description                    | Schema              |
|----------------|--------------------------------|---------------------|
| **Test**       | One test case definition       | Inferred (no table) |
| **Test execution** | One time a test was run   | `tests` table       |
| **Test run**   | One batch of executions        | `testRuns` table    |
