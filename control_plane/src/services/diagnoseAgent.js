const { chatJson, isLlmConfigured, getLlmConfig } = require("./llmClient");
const { fetchSuspectFiles } = require("./githubTools");
const {
  isCursorConfigured,
  getCursorConfig,
  diagnoseWithCursor,
} = require("./cursorClient");

const SYSTEM_PROMPT = `Você é um engenheiro de software sênior fazendo diagnóstico read-only.
Analise o incidente e responda APENAS JSON válido com este schema:
{
  "hypothesis": "string clara da causa provável",
  "confidence": 0.0 a 1.0,
  "rootCauseCategory": "bug|config|dependency|auth|billing|data|network|unknown",
  "evidence": ["fato observável 1", "fato 2"],
  "suspectFiles": [{"path":"...", "reason":"..."}],
  "recommendedNextSteps": ["passo 1", "passo 2"]
}
Regras:
- Não invente arquivos que não estejam no contexto / no repositório.
- Se evidência for fraca, baixe a confidence.
- Nunca sugira apagar dados de produção, desabilitar auth ou ignorar webhooks Stripe.
- Foque em causa raiz e próximos passos de investigação, não em patch completo.
- NÃO faça commits, PRs, alterações persistentes no repo, nem deploy.`;

/**
 * Escolhe provider: cursor > llm > heuristic (ou DIAGNOSIS_PROVIDER forçado).
 */
function getDiagnosisProvider() {
  const forced = String(process.env.DIAGNOSIS_PROVIDER || "auto").toLowerCase();
  if (forced === "heuristic") return "heuristic";
  if (forced === "cursor") return isCursorConfigured() ? "cursor" : "heuristic";
  if (forced === "openai" || forced === "gemini" || forced === "llm") {
    return isLlmConfigured() ? "llm" : "heuristic";
  }
  // auto
  if (isCursorConfigured()) return "cursor";
  if (isLlmConfigured()) return "llm";
  return "heuristic";
}

/**
 * Diagnóstico read-only: Cursor SDK → LLM → heurística.
 */
async function runDiagnosis(contextPack) {
  const codeSnippets = await fetchSuspectFiles(contextPack, 3);
  const enriched = {
    ...contextPack,
    codeSnippets: codeSnippets.map((f) => ({
      path: f.path,
      error: f.error || null,
      contentPreview: f.content ? f.content.slice(0, 2500) : null,
    })),
  };

  const provider = getDiagnosisProvider();

  if (provider === "cursor") {
    try {
      const result = await diagnoseWithCursor(enriched, {
        systemPrompt: SYSTEM_PROMPT,
      });
      return normalizeAgentOutput(result.parsed, {
        model: `cursor:${result.model}`,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
        rawResponse: result.raw,
        contextPack: enriched,
        source: "cursor",
      });
    } catch (err) {
      console.error(
        JSON.stringify({
          level: "error",
          message: "cursor_diagnosis_failed",
          error: err.message,
        }),
      );
      // Fallback: tenta LLM, senão heurística
      if (isLlmConfigured()) {
        try {
          return await runLlmDiagnosis(enriched);
        } catch (llmErr) {
          const fallback = heuristicDiagnosis(enriched);
          fallback.errorMessage = `${err.message}; llm: ${llmErr.message}`;
          fallback.model = "heuristic+cursor_error";
          return fallback;
        }
      }
      const fallback = heuristicDiagnosis(enriched);
      fallback.errorMessage = err.message;
      fallback.model = "heuristic+cursor_error";
      return fallback;
    }
  }

  if (provider === "llm") {
    try {
      return await runLlmDiagnosis(enriched);
    } catch (err) {
      const fallback = heuristicDiagnosis(enriched);
      fallback.errorMessage = err.message;
      fallback.model = "heuristic+llm_error";
      return fallback;
    }
  }

  return heuristicDiagnosis(enriched);
}

async function runLlmDiagnosis(enriched) {
  const result = await chatJson({
    system: SYSTEM_PROMPT,
    user: JSON.stringify(enriched, null, 2),
  });
  return normalizeAgentOutput(result.parsed, {
    model: result.model,
    tokenInput: result.tokenInput,
    tokenOutput: result.tokenOutput,
    rawResponse: { provider: getLlmConfig().provider, usage: true },
    contextPack: enriched,
    source: "llm",
  });
}

function normalizeAgentOutput(parsed, meta) {
  const confidence = clamp01(Number(parsed?.confidence ?? 0.4));
  return {
    hypothesis:
      String(parsed?.hypothesis || "Sem hipótese clara").slice(0, 4000),
    confidence,
    rootCauseCategory: String(parsed?.rootCauseCategory || "unknown").slice(
      0,
      64,
    ),
    evidence: asStringArray(parsed?.evidence),
    suspectFiles: asSuspectFiles(parsed?.suspectFiles, meta.contextPack),
    recommendedNextSteps: asStringArray(parsed?.recommendedNextSteps),
    model: meta.model,
    tokenInput: meta.tokenInput,
    tokenOutput: meta.tokenOutput,
    rawResponse: meta.rawResponse,
    contextPack: summarizeContext(meta.contextPack),
    source: meta.source || "llm",
  };
}

function heuristicDiagnosis(contextPack) {
  const inc = contextPack.incident || {};
  const meta = inc.metadata || {};
  const evidence = [];
  const steps = [];
  const suspectFiles = (contextPack.suspectPaths || []).map((path) => ({
    path,
    reason: "Referenciado no stack/culprit ou heurística do projeto",
  }));

  if (inc.title) evidence.push(`Título: ${inc.title}`);
  if (inc.message) evidence.push(`Mensagem: ${String(inc.message).slice(0, 300)}`);
  if (inc.culprit) evidence.push(`Culprit: ${inc.culprit}`);
  if (meta.exceptionType) evidence.push(`Exception: ${meta.exceptionType}`);
  if (inc.eventCount) evidence.push(`Ocorrências: ${inc.eventCount}`);
  if (inc.environment) evidence.push(`Ambiente: ${inc.environment}`);
  if (contextPack.similarIncidents?.length) {
    evidence.push(
      `${contextPack.similarIncidents.length} incidente(s) similares recentes no projeto`,
    );
  }

  let category = "unknown";
  let hypothesis = `Possível falha em "${inc.culprit || "desconhecido"}": ${inc.title || inc.message || "sem detalhes"}.`;
  let confidence = 0.35;

  const blob = `${inc.title} ${inc.message} ${meta.exceptionType} ${inc.culprit}`.toLowerCase();

  if (/token|jwt|unauthorized|401/.test(blob)) {
    category = "auth";
    hypothesis =
      "Falha relacionada a autenticação/JWT — token inválido, expirado ou tenant ausente.";
    confidence = 0.55;
    steps.push("Reproduzir com token válido/expirado e inspecionar authMiddleware");
  } else if (/stripe|webhook|billing|payment/.test(blob)) {
    category = "billing";
    hypothesis =
      "Falha no fluxo de billing/Stripe — assinatura webhook ou payload inválido.";
    confidence = 0.5;
    steps.push("Verificar assinatura do webhook e logs do stripeWebhookController");
  } else if (/econnrefused|timeout|network|enotfound/.test(blob)) {
    category = "network";
    hypothesis = "Falha de rede/conectividade com dependência externa ou banco.";
    confidence = 0.5;
    steps.push("Checar health do Postgres/Redis e variáveis de conexão");
  } else if (/null|undefined|typeerror|cannot read/.test(blob)) {
    category = "bug";
    hypothesis =
      "Bug de runtime (TypeError/null) — valor inesperado em caminho de código da aplicação.";
    confidence = 0.45;
    steps.push("Inspecionar frames in-app do stack e cobrir com teste unitário");
  } else if (/migration|relation|does not exist|unique|foreign key/.test(blob)) {
    category = "data";
    hypothesis = "Problema de schema/dados no PostgreSQL.";
    confidence = 0.5;
    steps.push("Comparar migrations aplicadas com o schema esperado");
  }

  steps.push("Confirmar com requestId/traceId correlacionados nos logs");
  steps.push("Só depois abrir proposta de correção (Fase 4) com aprovação humana");

  if (contextPack.codeSnippets?.some((c) => c.contentPreview)) {
    evidence.push("Trechos de código obtidos via GitHub (read-only)");
    confidence = Math.min(0.7, confidence + 0.1);
  }

  return {
    hypothesis,
    confidence,
    rootCauseCategory: category,
    evidence,
    suspectFiles,
    recommendedNextSteps: steps,
    model: "heuristic-v1",
    tokenInput: null,
    tokenOutput: null,
    rawResponse: { source: "heuristic" },
    contextPack: summarizeContext(contextPack),
    source: "heuristic",
  };
}

function summarizeContext(contextPack) {
  return {
    incidentId: contextPack.incident?.id,
    fingerprint: contextPack.incident?.fingerprint,
    projectSlug: contextPack.project?.slug,
    suspectPaths: contextPack.suspectPaths || [],
    similarCount: contextPack.similarIncidents?.length || 0,
    codeSnippetPaths: (contextPack.codeSnippets || []).map((c) => c.path),
    builtAt: contextPack.builtAt,
  };
}

function asStringArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v).slice(0, 500)).slice(0, 12);
}

function asSuspectFiles(value, contextPack) {
  if (Array.isArray(value) && value.length) {
    return value
      .map((v) =>
        typeof v === "string"
          ? { path: v, reason: "sugerido pelo modelo" }
          : {
              path: String(v.path || "").slice(0, 300),
              reason: String(v.reason || "").slice(0, 300),
            },
      )
      .filter((v) => v.path)
      .slice(0, 10);
  }
  return (contextPack?.suspectPaths || []).map((path) => ({
    path,
    reason: "derivado do contexto",
  }));
}

function clamp01(n) {
  if (!Number.isFinite(n)) return 0.3;
  return Math.max(0, Math.min(1, n));
}

module.exports = {
  runDiagnosis,
  heuristicDiagnosis,
  getDiagnosisProvider,
  SYSTEM_PROMPT,
  isCursorConfigured,
  getCursorConfig,
};
