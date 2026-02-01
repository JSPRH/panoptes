// For convex-test, we can pass undefined for modules if functions are in standard location
// or manually import them. Since import.meta.glob doesn't work in edge-runtime,
// we'll handle this in the test files directly.
export const modules = undefined;
