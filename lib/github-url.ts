function parseRepo(value: string) {
  const clean = value.trim().replace(/^https:\/\/github\.com\//i, "").replace(/\.git$/i, "").replace(/^\/+|\/+$/g, "");
  const [owner, repo] = clean.split("/");
  return owner && repo ? { owner, repo } : null;
}

export function getGitHubRepoInfo(): { owner: string; repo: string } | null {
  const rawRepo = process.env.GITHUB_SYNC_REPO || "";
  return parseRepo(rawRepo);
}

export function getCommitUrl(commitSha: string): string | null {
  const repo = getGitHubRepoInfo();
  if (!repo || !commitSha) return null;
  return `https://github.com/${repo.owner}/${repo.repo}/commit/${commitSha}`;
}

export function getGitHubBlobUrl(repoPath: string, branch?: string): string | null {
  const repo = getGitHubRepoInfo();
  if (!repo || !repoPath) return null;
  const b = branch || process.env.GITHUB_SYNC_BRANCH || process.env.RAILWAY_GIT_BRANCH || "main";
  return `https://github.com/${repo.owner}/${repo.repo}/blob/${encodeURIComponent(b)}/${repoPath}`;
}
