import type { ReactNode } from "react";

interface EmptyStateProps {
	title: string;
	description: string;
	action?: ReactNode;
	/** Optional image URL (e.g. /panoptes_under_fruit_tree.png) for illustration */
	image?: string;
}

export function EmptyState({ title, description, action, image }: EmptyStateProps) {
	return (
		<div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
			{image && (
				<img
					src={image}
					alt=""
					className="mx-auto h-32 w-auto object-contain opacity-90"
					aria-hidden
				/>
			)}
			<h3 className="text-lg font-semibold text-foreground mt-4">{title}</h3>
			<p className="mt-1 text-sm text-muted-foreground max-w-sm">{description}</p>
			{action && <div className="mt-4">{action}</div>}
		</div>
	);
}
