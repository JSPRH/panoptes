import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";

interface LayoutProps {
	children: ReactNode;
}

const navItems = [
	{ path: "/dashboard", label: "Dashboard" },
	{ path: "/pyramid", label: "Test Pyramid" },
	{ path: "/features", label: "Feature Explorer" },
	{ path: "/explorer", label: "Test Explorer" },
	{ path: "/runs", label: "Test Runs" },
	{ path: "/coverage-tree", label: "Coverage Tree" },
	{ path: "/anomalies", label: "Anomalies" },
	{ path: "/ci-runs", label: "CI Runs" },
	{ path: "/main-branch", label: "Main Branch" },
	{ path: "/pull-requests", label: "Pull Requests" },
	{ path: "/api-docs", label: "API Docs" },
];

// Pages that should not show the navigation sidebar
const pagesWithoutNav = ["/", "/imprint", "/agb", "/privacy"];

function NavLinks({
	currentPath,
	variant = "sidebar",
}: {
	currentPath: string;
	variant?: "sidebar" | "top";
}) {
	const isTop = variant === "top";
	return (
		<>
			{navItems.map((item) => {
				const isActive = currentPath === item.path;
				const activeClass = isActive
					? isTop
						? "bg-primary/10 text-primary"
						: "bg-primary/10 text-primary border-l-2 border-primary -ml-px pl-[11px]"
					: "text-muted-foreground hover:text-foreground hover:bg-muted/60";
				return (
					<Link
						key={item.path}
						to={item.path}
						className={`px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${isTop ? "inline-block" : "block"} ${activeClass}`}
					>
						{item.label}
					</Link>
				);
			})}
		</>
	);
}

export default function Layout({ children }: LayoutProps) {
	const location = useLocation();
	const showNav = !pagesWithoutNav.includes(location.pathname);

	return (
		<div className="min-h-screen bg-background flex flex-col lg:flex-row">
			{showNav && (
				<>
					{/* Top bar on small screens */}
					<header className="lg:hidden border-b border-border bg-card flex-shrink-0">
						<div className="px-4 py-4">
							<Link
								to="/"
								className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity"
							>
								<img
									src="/panoptes_logo_icon_only.png"
									alt=""
									className="h-8 w-auto"
									aria-hidden="true"
								/>
								<span className="font-heading font-semibold text-lg text-foreground">Panoptes</span>
							</Link>
							<nav className="mt-3 flex flex-wrap gap-1">
								<NavLinks currentPath={location.pathname} variant="top" />
							</nav>
						</div>
					</header>

					{/* Sidebar on lg+ */}
					<aside className="hidden lg:flex lg:w-56 lg:min-w-[14rem] border-r border-border bg-card flex-shrink-0">
						<div className="sticky top-0 flex flex-col w-full h-screen">
							<Link
								to="/"
								className="px-4 py-5 border-b border-border flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0"
							>
								<img
									src="/panoptes_logo_icon_only.png"
									alt=""
									className="h-8 w-auto"
									aria-hidden="true"
								/>
								<span className="font-heading font-semibold text-lg text-foreground">Panoptes</span>
							</Link>
							<nav className="flex-1 overflow-y-auto py-3 min-h-0">
								<div className="space-y-0.5 px-3">
									<NavLinks currentPath={location.pathname} variant="sidebar" />
								</div>
							</nav>
						</div>
					</aside>
				</>
			)}

			<main className="flex-1 min-w-0">
				{showNav ? (
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</div>
				) : (
					children
				)}
			</main>
		</div>
	);
}
