import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

export function ConvexConfigError() {
	const convexUrl = import.meta.env.VITE_CONVEX_URL || "";
	const isProduction = import.meta.env.PROD;

	if (convexUrl && !convexUrl.includes("127.0.0.1") && !convexUrl.includes("localhost")) {
		return null; // Configuration is valid
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-background p-4">
			<Card className="max-w-2xl w-full border-destructive">
				<CardHeader>
					<CardTitle className="text-destructive">Convex Configuration Error</CardTitle>
					<CardDescription>
						{isProduction
							? "VITE_CONVEX_URL is not configured for production"
							: "VITE_CONVEX_URL is not set or is using localhost"}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<h3 className="font-semibold mb-2">To fix this issue:</h3>
						{isProduction ? (
							<ol className="list-decimal list-inside space-y-2 text-sm">
								<li>
									Go to your Vercel project settings:{" "}
									<a
										href="https://vercel.com/dashboard"
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary underline"
									>
										vercel.com/dashboard
									</a>
								</li>
								<li>Navigate to your project → Settings → Environment Variables</li>
								<li>
									Add a new environment variable:
									<ul className="list-disc list-inside ml-4 mt-1">
										<li>
											<strong>Name:</strong> <code>VITE_CONVEX_URL</code>
										</li>
										<li>
											<strong>Value:</strong> Your production Convex URL (e.g.,{" "}
											<code>https://xxxxx.convex.cloud</code>)
										</li>
										<li>
											<strong>Environment:</strong> Production (and Preview if needed)
										</li>
									</ul>
								</li>
								<li>Redeploy your application</li>
							</ol>
						) : (
							<ol className="list-decimal list-inside space-y-2 text-sm">
								<li>
									Make sure you've run{" "}
									<code className="bg-muted px-1 py-0.5 rounded">bun run dev:convex</code> (or{" "}
									<code className="bg-muted px-1 py-0.5 rounded">bun run dev</code> from the{" "}
									<code className="bg-muted px-1 py-0.5 rounded">convex/</code> directory)
								</li>
								<li>
									Copy the <code className="bg-muted px-1 py-0.5 rounded">CONVEX_URL</code> from{" "}
									<code className="bg-muted px-1 py-0.5 rounded">convex/.env.local</code>
								</li>
								<li>
									Create or update{" "}
									<code className="bg-muted px-1 py-0.5 rounded">apps/web/.env</code> with:
									<pre className="bg-muted p-2 rounded mt-2 text-xs overflow-x-auto">
										VITE_CONVEX_URL=https://xxxxx.convex.cloud
									</pre>
								</li>
								<li>Restart your development server</li>
							</ol>
						)}
					</div>
					<div className="pt-4 border-t">
						<p className="text-sm text-muted-foreground">
							<strong>Current value:</strong>{" "}
							<code className="bg-muted px-1 py-0.5 rounded">{convexUrl || "NOT SET"}</code>
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
