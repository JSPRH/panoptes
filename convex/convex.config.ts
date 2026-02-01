import aggregate from "@convex-dev/aggregate/convex.config";
import { defineApp } from "convex/server";

const app = defineApp();

// Aggregate for tracking test definition counts by type and status
// Uses namespaces to separate by testType for efficient counting
app.use(aggregate, { name: "testDefinitionAggregate" });

// Cron jobs are automatically registered from scheduled.ts
// No need to manually register them here - Convex auto-detects cronJobs() exports

export default app;
