import { Link } from "react-router-dom";
import { PageHeader } from "./PageHeader";
import { Button } from "./ui/button";

interface GitHubPageHeaderProps {
	title: string;
	description: string;
	onSync?: () => void;
	showSyncButton?: boolean;
}

export function GitHubPageHeader({
	title,
	description,
	onSync,
	showSyncButton = false,
}: GitHubPageHeaderProps) {
	return (
		<div className="flex items-center justify-between">
			<div className="flex items-center gap-3">
				<Link to="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
					<img
						src="/panoptes_logo_icon_only.png"
						alt=""
						className="h-8 w-auto"
						aria-hidden="true"
					/>
					<span className="font-heading font-semibold text-lg text-foreground">Panoptes</span>
				</Link>
				<div className="h-6 w-px bg-border" />
				<PageHeader title={title} description={description} />
			</div>
			{showSyncButton && onSync && (
				<Button onClick={onSync} variant="outline" size="sm">
					Sync GitHub Data
				</Button>
			)}
		</div>
	);
}
