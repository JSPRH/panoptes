import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";

export default function Homepage() {
	return (
		<div className="min-h-screen">
			{/* Hero Section */}
			<section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-primary/5 py-20 lg:py-32">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="mx-auto max-w-4xl text-center">
						<div className="flex justify-center mb-8">
							<img
								src="/panoptes_logo_horizontal.png"
								alt="Panoptes"
								className="h-16 md:h-20 lg:h-24 w-auto"
							/>
						</div>
						<p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl md:text-2xl">
							Visualize your testing pyramid. Gain insights into your test coverage. Make
							data-driven decisions about your test suite.
						</p>
						<div className="mt-10 flex items-center justify-center gap-4">
							<Link to="/dashboard">
								<Button size="lg" className="text-base px-8 py-6">
									Get Started
								</Button>
							</Link>
							<a
								href="https://github.com/your-org/panoptes"
								target="_blank"
								rel="noopener noreferrer"
							>
								<Button size="lg" variant="outline" className="text-base px-8 py-6">
									View on GitHub
								</Button>
							</a>
						</div>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className="py-20 lg:py-32">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="mx-auto max-w-2xl text-center">
						<h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
							Everything you need to understand your tests
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							Panoptes provides comprehensive insights into your testing infrastructure, helping you
							build better software.
						</p>
					</div>

					<div className="mx-auto mt-16 max-w-6xl">
						<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
							<Card>
								<CardHeader>
									<CardTitle>Test Pyramid Visualization</CardTitle>
									<CardDescription>
										See your unit, integration, and E2E tests at a glance. Understand the health of
										your testing strategy.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="aspect-video rounded-lg overflow-hidden border border-border">
										<img
											src="/panoptes_viz_test_pyramid.png"
											alt="Test Pyramid Visualization"
											className="w-full h-full object-cover"
										/>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>CI Integration</CardTitle>
									<CardDescription>
										Connect with GitHub Actions to track CI runs, pull requests, and test results
										across your workflow.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="aspect-video rounded-lg overflow-hidden border border-border">
										<img
											src="/panoptes_viz_ci_pipeline.png"
											alt="CI Pipeline Visualization"
											className="w-full h-full object-cover"
										/>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Test Explorer</CardTitle>
									<CardDescription>
										Browse all your tests, filter by status, framework, or type. Dive deep into
										individual test details and execution history.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="aspect-video rounded-lg overflow-hidden border border-border">
										<img
											src="/panoptes_viz_test_success.png"
											alt="Test Success Visualization"
											className="w-full h-full object-cover"
										/>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Coverage Analysis</CardTitle>
									<CardDescription>
										Visualize code coverage with an interactive tree view. Identify untested code
										and improve your test coverage.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="aspect-video rounded-lg overflow-hidden border border-border">
										<img
											src="/panoptes_viz_code_coverage.png"
											alt="Code Coverage Visualization"
											className="w-full h-full object-cover"
										/>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Anomaly Detection</CardTitle>
									<CardDescription>
										AI-powered analysis to detect flaky tests, performance regressions, and unusual
										patterns in your test suite.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="aspect-video rounded-lg overflow-hidden border border-border">
										<img
											src="/panoptes_viz_anomaly_detection.png"
											alt="Anomaly Detection Visualization"
											className="w-full h-full object-cover"
										/>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardHeader>
									<CardTitle>Multi-Framework Support</CardTitle>
									<CardDescription>
										Works with Vitest, Playwright, and more. Easy integration with custom reporters
										that send data directly to Convex.
									</CardDescription>
								</CardHeader>
								<CardContent>
									<div className="aspect-video rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center">
										<span className="text-4xl">🔧</span>
									</div>
								</CardContent>
							</Card>
						</div>
					</div>
				</div>
			</section>

			{/* Visual Showcase Section */}
			<section className="bg-muted/30 py-20 lg:py-32">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="mx-auto max-w-2xl text-center mb-16">
						<h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
							See Panoptes in Action
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							Get a glimpse of the powerful visualizations and insights Panoptes provides.
						</p>
					</div>

					<div className="mx-auto max-w-6xl">
						<div className="grid gap-8 md:grid-cols-2">
							<Card className="overflow-hidden">
								<CardContent className="p-0">
									<img
										src="/panoptes_viz_test_pyramid.png"
										alt="Test Pyramid Visualization"
										className="w-full h-auto"
									/>
								</CardContent>
								<CardHeader>
									<CardTitle>Test Pyramid Overview</CardTitle>
									<CardDescription>
										Visualize the distribution of your unit, integration, and E2E tests at a glance.
									</CardDescription>
								</CardHeader>
							</Card>

							<Card className="overflow-hidden">
								<CardContent className="p-0">
									<img
										src="/panoptes_viz_ci_pipeline.png"
										alt="CI Pipeline Visualization"
										className="w-full h-auto"
									/>
								</CardContent>
								<CardHeader>
									<CardTitle>CI Pipeline Integration</CardTitle>
									<CardDescription>
										Track your CI runs, pull requests, and test results seamlessly integrated with
										GitHub Actions.
									</CardDescription>
								</CardHeader>
							</Card>

							<Card className="overflow-hidden">
								<CardContent className="p-0">
									<img
										src="/panoptes_viz_code_coverage.png"
										alt="Code Coverage Visualization"
										className="w-full h-auto"
									/>
								</CardContent>
								<CardHeader>
									<CardTitle>Code Coverage Analysis</CardTitle>
									<CardDescription>
										Explore your code coverage with interactive visualizations to identify gaps and
										improve test quality.
									</CardDescription>
								</CardHeader>
							</Card>

							<Card className="overflow-hidden">
								<CardContent className="p-0">
									<img
										src="/panoptes_viz_anomaly_detection.png"
										alt="Anomaly Detection Visualization"
										className="w-full h-auto"
									/>
								</CardContent>
								<CardHeader>
									<CardTitle>AI-Powered Anomaly Detection</CardTitle>
									<CardDescription>
										Automatically detect flaky tests, performance regressions, and unusual patterns
										in your test suite.
									</CardDescription>
								</CardHeader>
							</Card>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="bg-muted/50 py-20 lg:py-32">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="mx-auto max-w-2xl text-center">
						<h2 className="font-heading text-3xl font-bold tracking-tight sm:text-4xl">
							Ready to get started?
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							Start visualizing your test results today. It only takes a few minutes to set up.
						</p>
						<div className="mt-10">
							<Link to="/dashboard">
								<Button size="lg" className="text-base px-8 py-6">
									Go to Dashboard
								</Button>
							</Link>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="border-t border-border bg-card py-12">
				<div className="container mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid gap-8 md:grid-cols-4">
						<div className="md:col-span-2">
							<img src="/panoptes_logo_horizontal.png" alt="Panoptes" className="h-8 mb-4" />
							<p className="mt-2 text-sm text-muted-foreground">
								A test visualization platform that helps you understand and improve your testing
								strategy.
							</p>
						</div>
						<div>
							<h4 className="font-semibold text-sm">Product</h4>
							<ul className="mt-4 space-y-2">
								<li>
									<Link
										to="/dashboard"
										className="text-sm text-muted-foreground hover:text-foreground"
									>
										Dashboard
									</Link>
								</li>
								<li>
									<a
										href="https://github.com/your-org/panoptes"
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm text-muted-foreground hover:text-foreground"
									>
										Documentation
									</a>
								</li>
							</ul>
						</div>
						<div>
							<h4 className="font-semibold text-sm">Legal</h4>
							<ul className="mt-4 space-y-2">
								<li>
									<Link
										to="/imprint"
										className="text-sm text-muted-foreground hover:text-foreground"
									>
										Imprint
									</Link>
								</li>
								<li>
									<Link to="/agb" className="text-sm text-muted-foreground hover:text-foreground">
										Terms & Conditions
									</Link>
								</li>
								<li>
									<Link
										to="/privacy"
										className="text-sm text-muted-foreground hover:text-foreground"
									>
										Privacy Policy
									</Link>
								</li>
							</ul>
						</div>
					</div>
					<div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
						<p>&copy; {new Date().getFullYear()} Panoptes. All rights reserved.</p>
					</div>
				</div>
			</footer>
		</div>
	);
}
