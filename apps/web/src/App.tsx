import { ConvexProvider, ConvexReactClient } from "convex/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ConvexConfigError } from "./components/ConvexConfigError";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Anomalies from "./pages/Anomalies";
import CodeLens from "./pages/CodeLens";
import Dashboard from "./pages/Dashboard";
import TestExplorer from "./pages/TestExplorer";
import TestPyramid from "./pages/TestPyramid";

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
							<Route path="/" element={<Dashboard />} />
							<Route path="/pyramid" element={<TestPyramid />} />
							<Route path="/explorer" element={<TestExplorer />} />
							<Route path="/code-lens" element={<CodeLens />} />
							<Route path="/anomalies" element={<Anomalies />} />
						</Routes>
					</Layout>
				</BrowserRouter>
			</ConvexProvider>
		</ErrorBoundary>
	);
}

export default App;
