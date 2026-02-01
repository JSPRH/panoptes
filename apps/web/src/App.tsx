import { ConvexProvider, ConvexReactClient } from "convex/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ConvexConfigError } from "./components/ConvexConfigError";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import AGB from "./pages/AGB";
import APIDocs from "./pages/APIDocs";
import Anomalies from "./pages/Anomalies";
import CIRunDetail from "./pages/CIRunDetail";
import CIRuns from "./pages/CIRuns";
import CodeLens from "./pages/CodeLens";
import CoverageTree from "./pages/CoverageTree";
import Dashboard from "./pages/Dashboard";
import FileCoverageDetail from "./pages/FileCoverageDetail";
import Homepage from "./pages/Homepage";
import Imprint from "./pages/Imprint";
import Privacy from "./pages/Privacy";
import PullRequests from "./pages/PullRequests";
import TestDetail from "./pages/TestDetail";
import TestExecutionDetail from "./pages/TestExecutionDetail";
import TestExplorer from "./pages/TestExplorer";
import TestFiles from "./pages/TestFiles";
import TestPyramid from "./pages/TestPyramid";
import TestRunDetail from "./pages/TestRunDetail";
import TestRuns from "./pages/TestRuns";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";

// In production, we should never use localhost fallback
const isProduction = import.meta.env.PROD;
const isLocalhost = convexUrl.includes("127.0.0.1") || convexUrl.includes("localhost");

if (!convexUrl && isProduction) {
	console.error("VITE_CONVEX_URL is not set in production. Convex features will not work.");
	console.error("Please set VITE_CONVEX_URL in your Vercel environment variables.");
}

if (isLocalhost && isProduction) {
	console.error("VITE_CONVEX_URL is set to localhost in production. This will not work.");
	console.error("Please set VITE_CONVEX_URL to your production Convex URL in Vercel.");
}

console.log("Convex URL:", convexUrl || "NOT SET");

// Only use localhost fallback in development
const finalConvexUrl = convexUrl || (isProduction ? "" : "http://127.0.0.1:3210");

// Check if we should show configuration error
const shouldShowConfigError = isProduction && (!convexUrl || isLocalhost);

const convex = new ConvexReactClient(finalConvexUrl);

function App() {
	// Show configuration error screen if Convex URL is not properly configured in production
	if (shouldShowConfigError) {
		return (
			<ErrorBoundary>
				<ConvexConfigError />
			</ErrorBoundary>
		);
	}

	return (
		<ErrorBoundary>
			<ConvexProvider client={convex}>
				<BrowserRouter>
					<Layout>
						<Routes>
							<Route path="/" element={<Homepage />} />
							<Route path="/dashboard" element={<Dashboard />} />
							<Route path="/imprint" element={<Imprint />} />
							<Route path="/agb" element={<AGB />} />
							<Route path="/privacy" element={<Privacy />} />
							<Route path="/pyramid" element={<TestPyramid />} />
							<Route path="/explorer" element={<TestExplorer />} />
							<Route path="/runs" element={<TestRuns />} />
							<Route path="/runs/:runId" element={<TestRunDetail />} />
							<Route path="/executions/:executionId" element={<TestExecutionDetail />} />
							<Route path="/tests/:projectId/:name/:file" element={<TestDetail />} />
							<Route path="/code-lens" element={<CodeLens />} />
							<Route path="/coverage-tree" element={<CoverageTree />} />
							<Route path="/coverage/:file" element={<FileCoverageDetail />} />
							<Route path="/test-files" element={<TestFiles />} />
							<Route path="/anomalies" element={<Anomalies />} />
							<Route path="/ci-runs" element={<CIRuns />} />
							<Route path="/ci-runs/:runId" element={<CIRunDetail />} />
							<Route path="/pull-requests" element={<PullRequests />} />
							<Route path="/api-docs" element={<APIDocs />} />
						</Routes>
					</Layout>
				</BrowserRouter>
			</ConvexProvider>
		</ErrorBoundary>
	);
}

export default App;
