import { cn } from "@/lib/utils";
import * as React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
	variant?: "success" | "warning" | "error" | "neutral" | "info";
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
	({ className, variant = "neutral", ...props }, ref) => {
		const variantClasses = {
			success: "bg-success-muted text-success",
			warning: "bg-warning-muted text-warning",
			error: "bg-error-muted text-error",
			neutral: "bg-muted text-muted-foreground",
			info: "bg-info-muted text-info",
		};
		return (
			<span
				ref={ref}
				className={cn(
					"inline-flex items-center rounded-md px-2 py-1 text-xs font-medium",
					variantClasses[variant],
					className
				)}
				{...props}
			/>
		);
	}
);
Badge.displayName = "Badge";

export { Badge };
