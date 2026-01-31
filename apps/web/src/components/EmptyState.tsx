import type { ReactNode } from "react";

interface EmptyStateProps {
	title: string;
	description: string;
	action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
			<h3 className="text-lg font-semibold text-foreground">{title}</h3>
			<p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}
