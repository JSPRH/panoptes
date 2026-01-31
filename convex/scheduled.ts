import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run every 5 minutes to catch any missed failed CI runs
crons.interval(
	"processFailedCIRuns",
	{ minutes: 5 },
	internal.ciAnalysisActions._processFailedCIRunsBatch
);

export default crons;
