import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

interface CodeSnippetProps {
	content: string;
	language?: string;
	startLine: number;
	endLine: number;
	targetLine?: number;
	file?: string;
	repository?: string;
	commitSha?: string;
}

export default function CodeSnippet({
	content,
	language,
	startLine,
	endLine,
	targetLine,
	file,
	repository,
	commitSha,
}: CodeSnippetProps) {
	const lines = content.split("\n");
	const maxLineNumberLength = String(endLine).length;

	const getGitHubUrl = () => {
		if (!repository || !file) return null;
		const repoInfo = parseRepositoryUrl(repository);
		if (!repoInfo) return null;
		const ref = commitSha || "main";
		return `https://github.com/${repoInfo.owner}/${repoInfo.repo}/blob/${ref}/${file}#L${targetLine || startLine}`;
	};

	const githubUrl = getGitHubUrl();

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm font-medium">
						{file ? `Code: ${file}` : "Code Snippet"}
						{targetLine && ` (Line ${targetLine})`}
					</CardTitle>
					{githubUrl && (
						<a
							href={githubUrl}
							target="_blank"
							rel="noopener noreferrer"
							className="text-xs text-blue-600 hover:text-blue-800 underline"
						>
							View on GitHub
						</a>
					)}
				</div>
			</CardHeader>
			<CardContent>
				<div className="overflow-x-auto rounded-md bg-gray-900 p-4">
					<pre className="text-sm">
						<code>
							{lines.map((line, index) => {
								const lineNumber = startLine + index;
								const isTargetLine = targetLine === lineNumber;
								return (
									<div
										key={lineNumber}
										className={`flex ${
											isTargetLine ? "bg-yellow-900/30 border-l-2 border-yellow-500" : ""
										}`}
									>
										<span className="text-gray-500 select-none pr-4 text-right min-w-[3rem]">
											{String(lineNumber).padStart(maxLineNumberLength, " ")}
										</span>
										<span className={isTargetLine ? "text-yellow-200" : "text-gray-100"}>
											{line || " "}
										</span>
									</div>
								);
							})}
						</code>
					</pre>
				</div>
				{language && <div className="mt-2 text-xs text-muted-foreground">Language: {language}</div>}
			</CardContent>
		</Card>
	);
}

function parseRepositoryUrl(repository: string): { owner: string; repo: string } | null {
	const patterns = [
		/https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?(?:\/|$)/,
		/git@github\.com:([^\/]+)\/([^\/]+?)(?:\.git)?$/,
		/^([^\/]+)\/([^\/]+)$/,
	];

	for (const pattern of patterns) {
		const match = repository.match(pattern);
		if (match) {
			return { owner: match[1], repo: match[2] };
		}
	}
	return null;
}
