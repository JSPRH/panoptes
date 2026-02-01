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
						<h1 className="text-4xl font-heading font-bold tracking-tight sm:text-5xl md:text-6xl">
							Visualize Your Testing Pyramid
						</h1>
						<p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl md:text-2xl">
							Gain insights into your test coverage and make data-driven decisions about your test
							suite.
						</p>
						<div className="mt-10 flex items-center justify-center">
							<Link to="/dashboard">
								<Button size="lg" className="text-base px-8 py-6">
									Get Started
								</Button>
							</Link>
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
									<div className="aspect-video rounded-lg bg-gradient-to-br from-secondary/20 to-secondary/5 flex items-center justify-center gap-12 p-8">
										<img
											src="/vitest-logo.svg"
											alt="Vitest"
											className="h-20 w-auto drop-shadow-sm transition-transform hover:scale-105"
										/>
										<img
											src="/playwright-logo.svg"
											alt="Playwright"
											className="h-20 w-auto drop-shadow-sm transition-transform hover:scale-105"
										/>
									</div>
								</CardContent>
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
							Ready to visualize your tests?
						</h2>
						<p className="mt-4 text-lg text-muted-foreground">
							Connect your test framework and start gaining insights into your test coverage in
							minutes.
						</p>
						<div className="mt-10 flex items-center justify-center">
							<Link to="/dashboard">
								<Button size="lg" className="px-10 py-7 text-lg font-semibold">
									Start Visualizing Your Tests
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
