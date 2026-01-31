import { ConvexProvider, ConvexReactClient } from "convex/react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ErrorBoundary } from "./components/ErrorBoundary";
import Layout from "./components/Layout";
import Anomalies from "./pages/Anomalies";
import CodeLens from "./pages/CodeLens";
import Dashboard from "./pages/Dashboard";
import TestExplorer from "./pages/TestExplorer";
import TestPyramid from "./pages/TestPyramid";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";

if (!convexUrl) {
	console.error("VITE_CONVEX_URL is not set. Convex features will not work.");
	console.error("Current env:", import.meta.env);
}

console.log("Convex URL:", convexUrl || "NOT SET");

const convex = new ConvexReactClient(convexUrl || "http://127.0.0.1:3210");

function App() {
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
