import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export type CloudAgentActionType = "fix_test" | "fix_bug" | "add_coverage" | "enhance_coverage";

export interface CloudAgentButtonProps {
	onTrigger: (actionType?: CloudAgentActionType) => Promise<{ agentUrl?: string; prUrl?: string }>;
	disabled?: boolean;
	actionType?: CloudAgentActionType;
	showActionSelector?: boolean;
	className?: string;
	variant?: "default" | "outline";
	size?: "sm" | "default" | "lg";
	children?: React.ReactNode;
}

export function CloudAgentButton({
	onTrigger,
	disabled = false,
	actionType = "fix_bug",
	showActionSelector = false,
	className,
	variant = "default",
	size = "sm",
	children,
}: CloudAgentButtonProps) {
	const [isTriggering, setIsTriggering] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [agentResult, setAgentResult] = useState<{ agentUrl?: string; prUrl?: string } | null>(
		null
	);
	const [selectedActionType, setSelectedActionType] = useState<CloudAgentActionType>(actionType);

	const handleTrigger = async () => {
		if (isTriggering) return;
		setIsTriggering(true);
		setError(null);
		setAgentResult(null);
		try {
			const result = await onTrigger(currentActionType);
			setAgentResult(result);
			if (result.prUrl) {
				window.open(result.prUrl, "_blank");
			} else if (result.agentUrl) {
				window.open(result.agentUrl, "_blank");
			}
		} catch (e) {
			setError(e instanceof Error ? e.message : "Failed to trigger cloud agent");
		} finally {
			setIsTriggering(false);
		}
	};

	// Update selectedActionType when actionType prop changes
	useEffect(() => {
		if (!showActionSelector) {
			setSelectedActionType(actionType);
		}
	}, [actionType, showActionSelector]);

	const currentActionType = showActionSelector ? selectedActionType : actionType;

	return (
		<div className={className}>
			<div className="flex gap-2 items-center">
				{showActionSelector && (
					<select
						value={currentActionType}
						onChange={(e) => setSelectedActionType(e.target.value as CloudAgentActionType)}
						className="px-3 py-1.5 text-sm border rounded-md bg-background"
						disabled={isTriggering || disabled}
					>
						<option value="fix_bug">Fix Bug</option>
						<option value="fix_test">Fix Test</option>
						<option value="add_coverage">Add Coverage</option>
						<option value="enhance_coverage">Enhance Coverage</option>
					</select>
				)}
				<Button
					onClick={handleTrigger}
					disabled={isTriggering || disabled}
					variant={variant}
					size={size}
					className={showActionSelector ? "flex-1" : ""}
				>
					{isTriggering ? "Launching..." : children || "🚀 Launch Agent"}
				</Button>
			</div>
			{error && <div className="mt-2 text-sm text-destructive">{error}</div>}
			{agentResult && (
				<div className="mt-2 p-2 bg-muted rounded text-sm">
					{agentResult.prUrl ? (
						<div>
							✅ Cloud agent launched!{" "}
							<a
								href={agentResult.prUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:underline"
							>
								View Pull Request →
							</a>
						</div>
					) : agentResult.agentUrl ? (
						<div>
							✅ Cloud agent launched!{" "}
							<a
								href={agentResult.agentUrl}
								target="_blank"
								rel="noopener noreferrer"
								className="text-primary hover:underline"
							>
								View Agent →
							</a>
						</div>
					) : (
						<div>✅ Cloud agent launched!</div>
					)}
				</div>
			)}
		</div>
	);
}
