interface LoadingSpinnerProps {
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function LoadingSpinner({ size = "md", className = "" }: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: "h-8 w-8",
		md: "h-16 w-16",
		lg: "h-24 w-24",
	};

	return (
		<div className={`flex items-center justify-center ${className}`}>
			<img
				src="/panoptes_loading_spinner_transparent.png"
				alt="Loading..."
				className={`${sizeClasses[size]} animate-spin`}
				aria-hidden="true"
			/>
		</div>
	);
}
