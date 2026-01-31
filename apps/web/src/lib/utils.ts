import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/** Parse repository string (owner/repo, https://github.com/..., git@github.com:...) to owner and repo. */
export function parseRepositoryUrl(repository: string): { owner: string; repo: string } | null {
	const patterns = [
		/https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/|$)/,
		/git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
		/^([^/]+)\/([^/]+)$/,
	];
	for (const pattern of patterns) {
		const match = repository.match(pattern);
		if (match) return { owner: match[1], repo: match[2] };
	}
	return null;
}

/** Build https://github.com/owner/repo/blob/ref/file#Lline URL. Returns null if repository cannot be parsed. */
export function getGitHubBlobUrl(
	repository: string,
	file: string,
	options?: { line?: number; ref?: string }
): string | null {
	const info = parseRepositoryUrl(repository);
	if (!info) return null;
	const ref = options?.ref ?? "main";
	const hash = options?.line != null ? `#L${options.line}` : "";
	return `https://github.com/${info.owner}/${info.repo}/blob/${ref}/${file}${hash}`;
}
