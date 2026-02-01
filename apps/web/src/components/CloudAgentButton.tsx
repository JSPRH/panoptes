import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export type CloudAgentActionType = "fix_test" | "fix_bug" | "add_coverage" | "enhance_coverage";

export interface CloudAgentButtonProps {
	onTrigger: (
		actionType?: CloudAgentActionType,
		createPR?: boolean
	) => Promise<{
		agentUrl?: string;
		prUrl?: string;
		branch?: string;
		commitSha?: string;
		createPR?: boolean;
	}>;
	disabled?: boolean;
	actionType?: CloudAgentActionType;
	showActionSelector?: boolean;
	showPRToggle?: boolean;
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
	showPRToggle = false,
	className,
	variant = "default",
	size = "sm",
	children,
}: CloudAgentButtonProps) {
	const [isTriggering, setIsTriggering] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [agentResult, setAgentResult] = useState<{
		agentUrl?: string;
		prUrl?: string;
		branch?: string;
		commitSha?: string;
		createPR?: boolean;
	} | null>(null);
	const [selectedActionType, setSelectedActionType] = useState<CloudAgentActionType>(actionType);
	const [createPR, setCreatePR] = useState(true);

	const handleTrigger = async () => {
		if (isTriggering) return;
		setIsTriggering(true);
		setError(null);
		setAgentResult(null);
		try {
			const result = await onTrigger(currentActionType, createPR);
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

	// Generate git push command based on result
	const getGitPushCommand = () => {
		if (!agentResult?.branch) return null;
		// Show command to push to the branch (works for both PR and direct push)
		return `git push origin ${agentResult.branch}`;
	};

	const gitCommand = getGitPushCommand();

	return (
		<div className={className}>
			<div className="flex flex-col gap-2">
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
					{showPRToggle && (
						<select
							value={createPR ? "pr" : "branch"}
							onChange={(e) => setCreatePR(e.target.value === "pr")}
							className="px-3 py-1.5 text-sm border rounded-md bg-background"
							disabled={isTriggering || disabled}
						>
							<option value="pr">Create PR</option>
							<option value="branch">Push to Branch</option>
						</select>
					)}
					<Button
						onClick={handleTrigger}
						disabled={isTriggering || disabled}
						variant={variant}
						size={size}
						className={showActionSelector || showPRToggle ? "flex-1" : ""}
					>
						{isTriggering ? "Launching..." : children || "🚀 Launch Agent"}
					</Button>
				</div>
			</div>
			{error && <div className="mt-2 text-sm text-destructive">{error}</div>}
			{agentResult && (
				<div className="mt-2 p-3 bg-muted rounded text-sm space-y-2">
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
					{gitCommand && (
						<div className="mt-2 pt-2 border-t border-border">
							<div className="text-xs text-muted-foreground mb-1">
								To push changes to your branch:
							</div>
							<code className="block px-2 py-1 bg-background border rounded text-xs font-mono break-all">
								{gitCommand}
							</code>
							<button
								type="button"
								onClick={() => {
									navigator.clipboard.writeText(gitCommand);
								}}
								className="mt-1 text-xs text-primary hover:underline"
							>
								Copy command
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
