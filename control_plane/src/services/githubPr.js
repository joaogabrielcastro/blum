/**
 * GitHub helpers Fase 5: parse PR URL + polling de check runs (sandbox CI).
 * Nunca faz merge/deploy.
 */

function parseRepoFullName(repo) {
  if (!repo) return null;
  const cleaned = String(repo)
    .replace(/^https?:\/\/github\.com\//i, "")
    .replace(/\.git$/i, "")
    .replace(/\/+$/, "");
  const m = cleaned.match(/^([^/]+)\/([^/]+)$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

function parsePrUrl(prUrl) {
  if (!prUrl) return null;
  const m = String(prUrl).match(
    /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i,
  );
  if (!m) return null;
  return {
    repoFullName: `${m[1]}/${m[2]}`,
    prNumber: Number(m[3]),
    prUrl: String(prUrl),
  };
}

function extractPrNumberFromUrl(prUrl) {
  const parsed = parsePrUrl(prUrl);
  return parsed ? parsed.prNumber : null;
}

function extractBranchFromGit(resultGit) {
  const branches = resultGit?.branches || [];
  if (!branches.length) return { branch: null, prUrl: null };
  const first = branches[0];
  return {
    branch: first.branch || null,
    prUrl: first.prUrl || null,
  };
}

async function githubFetch(path, { method = "GET", token } = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "blum-control-plane",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

/**
 * Resume checks/statuses da PR. Sem token → { status: 'unknown' }.
 */
async function pollPullRequestChecks({
  repoFullName,
  prNumber,
  token = process.env.GITHUB_TOKEN,
}) {
  const repo = parseRepoFullName(repoFullName);
  if (!repo || !prNumber) {
    return {
      status: "unknown",
      summary: { reason: "repo_or_pr_missing" },
    };
  }
  if (!token) {
    return {
      status: "unknown",
      summary: { reason: "GITHUB_TOKEN_missing" },
    };
  }

  const prRes = await githubFetch(`/repos/${repo}/pulls/${prNumber}`, {
    token,
  });
  if (!prRes.ok) {
    return {
      status: "unknown",
      summary: {
        reason: "pr_fetch_failed",
        httpStatus: prRes.status,
      },
    };
  }

  const headSha = prRes.body?.head?.sha;
  const headRef = prRes.body?.head?.ref;
  if (!headSha) {
    return {
      status: "unknown",
      summary: { reason: "missing_head_sha", branch: headRef },
    };
  }

  const checksRes = await githubFetch(
    `/repos/${repo}/commits/${headSha}/check-runs?per_page=50`,
    { token },
  );
  const statusRes = await githubFetch(
    `/repos/${repo}/commits/${headSha}/status`,
    { token },
  );

  const checkRuns = checksRes.ok ? checksRes.body?.check_runs || [] : [];
  const combinedState = statusRes.ok ? statusRes.body?.state : null;

  const conclusions = checkRuns.map((c) => ({
    name: c.name,
    status: c.status,
    conclusion: c.conclusion,
  }));

  const anyPending =
    checkRuns.some((c) => c.status !== "completed") ||
    combinedState === "pending";
  const anyFail =
    checkRuns.some(
      (c) =>
        c.status === "completed" &&
        ["failure", "timed_out", "cancelled", "action_required"].includes(
          c.conclusion,
        ),
    ) ||
    combinedState === "failure" ||
    combinedState === "error";

  let status = "unknown";
  if (anyFail) status = "failing";
  else if (anyPending) status = "pending";
  else if (!checkRuns.length && !combinedState) status = "pending";
  else if (
    (!anyFail && checkRuns.length > 0) ||
    combinedState === "success"
  ) {
    status = "passing";
  }

  return {
    status,
    summary: {
      branch: headRef,
      headSha,
      combinedState,
      checks: conclusions,
      draft: Boolean(prRes.body?.draft),
      htmlUrl: prRes.body?.html_url || null,
    },
  };
}

module.exports = {
  parseRepoFullName,
  parsePrUrl,
  extractPrNumberFromUrl,
  extractBranchFromGit,
  pollPullRequestChecks,
};
