// Aggregates temporarily disabled to unblock - will re-enable once basic functions are working
// import aggregate from "@convex-dev/aggregate/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();

// Three aggregates for tracking total, passed, and failed test counts
// Temporarily commented out to unblock deployment
// app.use(aggregate, { name: "testPyramidTotal" });
// app.use(aggregate, { name: "testPyramidPassed" });
// app.use(aggregate, { name: "testPyramidFailed" });

// Cron jobs are automatically registered from scheduled.ts
// No need to manually register them here - Convex auto-detects cronJobs() exports

export default app;
