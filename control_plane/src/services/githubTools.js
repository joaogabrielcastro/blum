/**
 * Ferramentas GitHub read-only (opcional).
 * Requer GITHUB_TOKEN com scope contents:read.
 */

async function fetchRepoFile({ repoFullName, path, ref = "main" }) {
  const token = process.env.GITHUB_TOKEN;
  if (!token || !repoFullName || !path) return null;

  const url =
    `https://api.github.com/repos/${repoFullName}/contents/` +
    `${encodeURI(path.replace(/^\/+/, ""))}` +
    `?ref=${encodeURIComponent(ref)}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github.raw+json",
      "User-Agent": "blum-control-plane",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (!res.ok) {
    return {
      path,
      error: `GitHub HTTP ${res.status}`,
      content: null,
    };
  }

  const content = await res.text();
  return {
    path,
    content: content.slice(0, 8000),
    truncated: content.length > 8000,
  };
}

async function fetchSuspectFiles(contextPack, limit = 3) {
  const repo = contextPack.project?.repoFullName;
  if (!repo || !process.env.GITHUB_TOKEN) return [];

  const paths = (contextPack.suspectPaths || []).slice(0, limit);
  const files = [];
  for (const path of paths) {
    const file = await fetchRepoFile({
      repoFullName: repo,
      path,
      ref: contextPack.project?.defaultBranch || "main",
    });
    if (file) files.push(file);
  }
  return files;
}

module.exports = { fetchRepoFile, fetchSuspectFiles };
