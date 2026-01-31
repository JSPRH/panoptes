import { Component, type ReactNode } from "react";

interface Props {
	children: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("Error caught by boundary:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="min-h-screen flex items-center justify-center bg-background">
					<div className="max-w-md w-full p-6 border border-destructive rounded-lg">
						<h1 className="text-2xl font-bold text-destructive mb-4">Something went wrong</h1>
						<p className="text-muted-foreground mb-4">
							{this.state.error?.message || "An unexpected error occurred"}
						</p>
						<pre className="text-xs bg-muted p-4 rounded overflow-auto">
							{this.state.error?.stack}
						</pre>
						<button
							type="button"
							onClick={() => window.location.reload()}
							className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded"
						>
							Reload Page
						</button>
					</div>
				</div>
			);
		}

		return this.props.children;
	}
}
