// @ts-ignore - Convex generates this file
import { api } from "@convex/_generated/api.js";
import type { Id } from "@convex/_generated/dataModel";
import { useAction, useMutation } from "convex/react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

type Repository = {
	fullName: string;
	name: string;
	owner: string;
	url: string;
	private: boolean;
	description: string | null;
};

interface RepositoryConfigProps {
	projectId: Id<"projects">;
	onSaved?: () => void;
	description?: string;
	compact?: boolean;
}

export function RepositoryConfig({
	projectId,
	onSaved,
	description = "Configure the GitHub repository for this project",
	compact = false,
}: RepositoryConfigProps) {
	const [showRepoConfig, setShowRepoConfig] = useState(false);
	const [selectedRepo, setSelectedRepo] = useState<string>("");
	const [repoSearch, setRepoSearch] = useState("");
	const [isLoadingRepos, setIsLoadingRepos] = useState(false);
	const [availableRepos, setAvailableRepos] = useState<Repository[]>([]);

	const updateProjectRepository = useMutation(api.tests.updateProjectRepository);
	const getAvailableRepositories = useAction(api.github.getAvailableRepositories);

	const handleLoadRepositories = async () => {
		setIsLoadingRepos(true);
		try {
			const repos = await getAvailableRepositories({ limit: 100 });
			setAvailableRepos(repos);
		} catch (error) {
			console.error("Failed to load repositories:", error);
			alert(
				`Failed to load repositories: ${error instanceof Error ? error.message : String(error)}`
			);
		} finally {
			setIsLoadingRepos(false);
		}
	};

	const handleShowRepoConfig = () => {
		setShowRepoConfig(true);
		if (availableRepos.length === 0) {
			handleLoadRepositories();
		}
	};

	const handleSaveRepository = async () => {
		if (!projectId || !selectedRepo.trim()) {
			alert("Please select a repository");
			return;
		}
		try {
			await updateProjectRepository({
				projectId,
				repository: selectedRepo.trim(),
			});
			setShowRepoConfig(false);
			setSelectedRepo("");
			setRepoSearch("");
			alert("Repository saved successfully!");
			onSaved?.();
		} catch (error) {
			console.error("Failed to save repository:", error);
			alert(`Failed to save: ${error instanceof Error ? error.message : String(error)}`);
		}
	};

	const filteredRepos = availableRepos.filter(
		(repo) =>
			repo.fullName.toLowerCase().includes(repoSearch.toLowerCase()) ||
			repo.description?.toLowerCase().includes(repoSearch.toLowerCase())
	);

	if (compact && !showRepoConfig) {
		return (
			<div className="flex items-center justify-between rounded-lg border border-border bg-card p-4">
				<div>
					<p className="text-sm font-medium">Repository not configured</p>
					<p className="text-xs text-muted-foreground mt-1">
						Configure a GitHub repository to view data for this project
					</p>
				</div>
				<Button onClick={handleShowRepoConfig} variant="outline" size="sm">
					Configure Repository
				</Button>
			</div>
		);
	}

	if (!showRepoConfig) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle>Configure Repository</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!showRepoConfig ? (
					<>
						<p className="text-muted-foreground">
							This project doesn't have a repository configured. Add a repository URL to view data.
						</p>
						<div className="space-y-2">
							<Button onClick={handleShowRepoConfig} variant="default" size="sm">
								Configure Repository
							</Button>
							<p className="text-xs text-muted-foreground">
								Note: Make sure GITHUB_ACCESS_TOKEN is configured in Convex secrets for GitHub API
								access.
							</p>
						</div>
					</>
				) : (
					<div className="space-y-4">
						<div>
							<label htmlFor="repo-select" className="block text-sm font-medium mb-2">
								Select Repository
							</label>
							{isLoadingRepos ? (
								<div className="text-sm text-muted-foreground">Loading repositories...</div>
							) : availableRepos.length === 0 ? (
								<div className="space-y-2">
									<p className="text-sm text-muted-foreground">
										No repositories loaded. Click "Load Repositories" to fetch from GitHub.
									</p>
									<Button onClick={handleLoadRepositories} variant="outline" size="sm">
										Load Repositories
									</Button>
								</div>
							) : (
								<div className="space-y-2">
									<input
										type="text"
										placeholder="Search repositories..."
										value={repoSearch}
										onChange={(e) => setRepoSearch(e.target.value)}
										className="w-full px-4 py-2 border rounded-md mb-2"
									/>
									<select
										id="repo-select"
										value={selectedRepo}
										onChange={(e) => setSelectedRepo(e.target.value)}
										className="w-full px-4 py-2 border rounded-md"
										size={Math.min(filteredRepos.length, 10)}
									>
										<option value="">-- Select a repository --</option>
										{filteredRepos.map((repo) => (
											<option key={repo.fullName} value={repo.fullName}>
												{repo.fullName} {repo.private ? "(private)" : ""}
												{repo.description ? ` - ${repo.description}` : ""}
											</option>
										))}
									</select>
									{filteredRepos.length === 0 && repoSearch && (
										<p className="text-xs text-muted-foreground">
											No repositories found matching "{repoSearch}"
										</p>
									)}
									<p className="text-xs text-muted-foreground">
										Showing {filteredRepos.length} of {availableRepos.length} repositories
									</p>
								</div>
							)}
						</div>
						<div className="flex gap-2">
							<Button
								onClick={handleSaveRepository}
								variant="default"
								size="sm"
								disabled={!selectedRepo.trim()}
							>
								Save Repository
							</Button>
							<Button
								onClick={() => {
									setShowRepoConfig(false);
									setSelectedRepo("");
									setRepoSearch("");
								}}
								variant="outline"
								size="sm"
							>
								Cancel
							</Button>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
