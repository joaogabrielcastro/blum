/**
 * Provider Cursor SDK (@cursor/sdk).
 * Cloud por padrão. Nunca auto-cria PR.
 */

function getCursorApiKey() {
  return process.env.CURSOR_API_KEY && String(process.env.CURSOR_API_KEY).trim()
    ? String(process.env.CURSOR_API_KEY).trim()
    : "";
}

function isCursorConfigured() {
  return Boolean(getCursorApiKey());
}

function getCursorConfig() {
  if (!isCursorConfigured()) {
    return { enabled: false };
  }

  return {
    enabled: true,
    apiKey: getCursorApiKey(),
    model: process.env.CURSOR_MODEL || "composer-2.5",
    runtime: (process.env.CURSOR_RUNTIME || "cloud").toLowerCase(),
    localCwd: process.env.CURSOR_LOCAL_CWD || null,
    repoUrlOverride: process.env.CURSOR_REPO_URL || null,
  };
}

function resolveRepoUrl(contextPack) {
  const cfg = getCursorConfig();
  if (cfg.repoUrlOverride && String(cfg.repoUrlOverride).trim()) {
    return String(cfg.repoUrlOverride).trim();
  }

  const full =
    contextPack?.project?.repoFullName ||
    contextPack?.project?.repo_full_name ||
    null;
  if (!full) return null;
  if (/^https?:\/\//i.test(full)) return full;
  return `https://github.com/${full}`;
}

function safeParseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const m = String(text).match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* ignore */
      }
    }
    return {
      hypothesis: String(text || "").slice(0, 2000),
      confidence: 0.35,
      rootCauseCategory: "unknown",
      evidence: ["Resposta do Cursor não veio em JSON válido"],
      suspectFiles: [],
      recommendedNextSteps: [
        "Revisar o transcript do agente Cursor manualmente",
      ],
    };
  }
}

/**
 * One-shot Cursor prompt → JSON.
 */
async function runCursorJsonPrompt(contextPack, opts) {
  const cfg = getCursorConfig();
  if (!cfg.enabled) {
    throw new Error("CURSOR_API_KEY não configurada");
  }

  const { Agent, CursorAgentError } = require("@cursor/sdk");

  const prompt = [
    opts.systemPrompt,
    "",
    "Contexto (JSON):",
    JSON.stringify(opts.userPayload, null, 2),
    "",
    opts.noPersistNote ||
      "Responda APENAS com o JSON do schema. Não faça commits, PRs, edits persistentes nem deploys.",
  ].join("\n");

  /** @type {Record<string, unknown>} */
  const options = {
    apiKey: cfg.apiKey,
    model: { id: cfg.model },
    name:
      opts.name ||
      `blum-${contextPack?.project?.slug || "saas"}-${String(contextPack?.incident?.id || "").slice(0, 8)}`,
    mode: opts.mode || "plan",
  };

  if (cfg.runtime === "local") {
    options.local = {
      cwd: cfg.localCwd || process.cwd(),
      settingSources: [],
    };
  } else {
    const repoUrl = resolveRepoUrl(contextPack);
    if (!repoUrl) {
      throw new Error(
        "Cursor cloud exige project.repo_full_name ou CURSOR_REPO_URL",
      );
    }
    options.cloud = {
      repos: [
        {
          url: repoUrl,
          startingRef: contextPack?.project?.defaultBranch || "main",
        },
      ],
      autoCreatePR: false,
      skipReviewerRequest: true,
    };
  }

  let result;
  try {
    const timeoutMs = Number(process.env.CURSOR_TIMEOUT_MS || 240000);
    result = await Promise.race([
      Agent.prompt(prompt, options),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Cursor timeout após ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } catch (err) {
    if (err instanceof CursorAgentError) {
      const wrapped = new Error(
        `Cursor startup failed: ${err.message} (retryable=${Boolean(err.isRetryable)})`,
      );
      wrapped.cause = err;
      wrapped.retryable = Boolean(err.isRetryable);
      throw wrapped;
    }
    throw err;
  }

  if (result.status === "error") {
    throw new Error(
      `Cursor run failed: ${result.error?.message || result.id}`,
    );
  }
  if (result.status === "cancelled") {
    throw new Error(`Cursor run cancelled: ${result.id}`);
  }

  const text = result.result || "";
  const parsed = safeParseJson(text);
  const usage = result.usage || {};

  return {
    parsed,
    model: result.model?.id || cfg.model,
    tokenInput: usage.inputTokens ?? usage.promptTokens ?? null,
    tokenOutput: usage.outputTokens ?? usage.completionTokens ?? null,
    raw: {
      provider: "cursor",
      runtime: cfg.runtime,
      runId: result.id,
      requestId: result.requestId || null,
      durationMs: result.durationMs ?? null,
      status: result.status,
      mode: opts.mode || "plan",
    },
  };
}

async function diagnoseWithCursor(contextPack, { systemPrompt }) {
  return runCursorJsonPrompt(contextPack, {
    systemPrompt,
    userPayload: contextPack,
    mode: "plan",
    name: `blum-diag-${contextPack?.project?.slug || "saas"}-${String(contextPack?.incident?.id || "").slice(0, 8)}`,
  });
}

async function proposeWithCursor(contextPack, { systemPrompt, diagnosis }) {
  return runCursorJsonPrompt(contextPack, {
    systemPrompt,
    userPayload: { contextPack, diagnosis },
    mode: "plan",
    name: `blum-propose-${contextPack?.project?.slug || "saas"}-${String(contextPack?.incident?.id || "").slice(0, 8)}`,
    noPersistNote:
      "Responda APENAS JSON com summary/rationale/testPlan/files[].diff (unified diff). NÃO faça commit, PR, push nem deploy.",
  });
}

module.exports = {
  isCursorConfigured,
  getCursorConfig,
  resolveRepoUrl,
  diagnoseWithCursor,
  proposeWithCursor,
  runCursorJsonPrompt,
  safeParseJson,
};
