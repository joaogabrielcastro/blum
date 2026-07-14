/**
 * Abre PR via Cursor cloud (autoCreatePR) **somente** após approve humano.
 * Nunca faz merge nem deploy.
 */

const {
  isCursorConfigured,
  getCursorConfig,
  resolveRepoUrl,
} = require("./cursorClient");
const {
  extractBranchFromGit,
  extractPrNumberFromUrl,
  parseRepoFullName,
} = require("./githubPr");

async function openPrWithCursor({
  proposal,
  files,
  incident,
  project,
  diagnosis,
}) {
  if (!isCursorConfigured()) {
    throw new Error(
      "CURSOR_API_KEY ausente — necessária para abrir PR na Fase 5",
    );
  }

  const cfg = getCursorConfig();
  if (cfg.runtime === "local") {
    throw new Error(
      "Abertura de PR exige CURSOR_RUNTIME=cloud (autoCreatePR)",
    );
  }

  const contextPack = {
    project: {
      slug: project?.slug,
      repoFullName: project?.repo_full_name || project?.repoFullName,
      defaultBranch: project?.default_branch || project?.defaultBranch || "main",
    },
    incident: {
      id: incident?.id,
      title: incident?.title,
      culprit: incident?.culprit,
    },
  };

  const repoUrl = resolveRepoUrl(contextPack);
  if (!repoUrl) {
    throw new Error("repo URL ausente (CURSOR_REPO_URL ou project.repo_full_name)");
  }

  const quarantine = proposal.policy_mode === "propose_quarantine";
  const titlePrefix = quarantine ? "[QUARANTINE] " : "";
  const draftHint = quarantine
    ? "Abra a PR como draft se possível e deixe claro no body que é CRITICAL/quarantine."
    : "Abra a PR normalmente (não draft), pronta para review humana.";

  const fileBlock = (files || [])
    .map(
      (f) =>
        `### ${f.path} (${f.change_type || f.changeType || "modify"} / ${f.risk_tier || ""})\n\`\`\`diff\n${f.diff_unified || f.diffUnified || ""}\n\`\`\``,
    )
    .join("\n\n");

  const prompt = [
    "Você é um engenheiro aplicando uma correção JÁ APROVADA por um humano.",
    "Aplique APENAS os diffs abaixo (mínima alteração). Não expanda o escopo.",
    "Não faça merge. Não faça deploy. Não altere secrets/.env de produção.",
    "Não remova auth, validação de webhook Stripe, ou RLS.",
    draftHint,
    "",
    `Título sugerido da PR: ${titlePrefix}fix(control-plane): ${String(proposal.summary || "").slice(0, 72)}`,
    "",
    "Resumo aprovado:",
    proposal.summary || "",
    "",
    "Rationale:",
    proposal.rationale || "",
    "",
    "Plano de testes:",
    JSON.stringify(proposal.test_plan || proposal.testPlan || [], null, 2),
    "",
    "Diagnóstico (contexto):",
    diagnosis?.hypothesis || "",
    "",
    "Incidente:",
    `${incident?.title || ""} (${incident?.id || ""})`,
    "",
    "Diffs aprovados:",
    fileBlock || "(nenhum arquivo — não invente mudanças; aborte se vazio)",
    "",
    "Ao terminar, confirme branch e URL da PR no texto final.",
  ].join("\n");

  const { Agent, CursorAgentError } = require("@cursor/sdk");

  const options = {
    apiKey: cfg.apiKey,
    model: { id: cfg.model },
    name: `blum-pr-${project?.slug || "saas"}-${String(proposal.id).slice(0, 8)}`,
    cloud: {
      repos: [
        {
          url: repoUrl,
          startingRef: contextPack.project.defaultBranch,
        },
      ],
      autoCreatePR: true,
      skipReviewerRequest: true,
    },
  };

  let result;
  try {
    const timeoutMs = Number(process.env.CURSOR_PR_TIMEOUT_MS || 420000);
    result = await Promise.race([
      Agent.prompt(prompt, options),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Cursor PR timeout após ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      const wrapped = new Error(
        `Cursor PR failed: ${err.message} (retryable=${Boolean(err.isRetryable)})`,
      );
      wrapped.cause = err;
      wrapped.retryable = Boolean(err.isRetryable);
      throw wrapped;
    }
    throw err;
  }

  if (result.status === "error") {
    throw new Error(
      `Cursor PR run failed: ${result.error?.message || result.id}`,
    );
  }
  if (result.status === "cancelled") {
    throw new Error(`Cursor PR run cancelled: ${result.id}`);
  }

  const fromGit = extractBranchFromGit(result.git);
  let prUrl = fromGit.prUrl || null;
  const text = String(result.result || "");
  if (!prUrl) {
    const m = text.match(/https?:\/\/github\.com\/[^\s)]+\/pull\/\d+/i);
    if (m) prUrl = m[0];
  }

  return {
    prUrl,
    prNumber: extractPrNumberFromUrl(prUrl),
    prBranch: fromGit.branch || null,
    agentId: result.agentId || null,
    runId: result.id || null,
    model: result.model?.id || cfg.model,
    raw: {
      provider: "cursor",
      status: result.status,
      durationMs: result.durationMs ?? null,
      textExcerpt: text.slice(0, 2000),
      repoUrl,
      quarantine,
      repoFullName: parseRepoFullName(
        contextPack.project.repoFullName || repoUrl,
      ),
    },
  };
}

module.exports = {
  openPrWithCursor,
};
