import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
	children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
	const location = useLocation();

	const navItems = [
		{ path: "/", label: "Dashboard" },
		{ path: "/pyramid", label: "Test Pyramid" },
		{ path: "/explorer", label: "Test Explorer" },
		{ path: "/code-lens", label: "Code Lens" },
		{ path: "/anomalies", label: "Anomalies" },
		{ path: "/ci-runs", label: "CI Runs" },
		{ path: "/pull-requests", label: "Pull Requests" },
	];

	return (
		<div className="min-h-screen bg-background">
			<nav className="border-b border-border">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-8">
							<Link to="/" className="text-xl font-bold">
								Panoptes
							</Link>
							<div className="flex space-x-4">
								{navItems.map((item) => (
									<Link
										key={item.path}
										to={item.path}
										className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
											location.pathname === item.path
												? "bg-primary text-primary-foreground"
												: "text-muted-foreground hover:text-foreground hover:bg-accent"
										}`}
									>
										{item.label}
									</Link>
								))}
							</div>
						</div>
					</div>
				</div>
			</nav>
			<main className="container mx-auto px-4 py-8">{children}</main>
		</div>
	);
}
