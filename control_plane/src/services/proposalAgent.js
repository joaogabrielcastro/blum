const { isCursorConfigured, proposeWithCursor } = require("./cursorClient");
const { classifyProposalFiles } = require("./policyEngine");
const { buildIncidentContext } = require("./contextBuilder");

const PROPOSAL_SYSTEM = `Você é um engenheiro sênior propondo uma correção segura.
Responda APENAS JSON válido:
{
  "summary": "resumo curto da correção",
  "rationale": "por que essa correção resolve a causa",
  "confidence": 0.0-1.0,
  "testPlan": ["comando ou passo de validação"],
  "files": [
    {
      "path": "caminho/relativo/no/repo",
      "changeType": "modify|add|delete",
      "diff": "unified diff completo (--- / +++ / @@)"
    }
  ]
}
Regras:
- Prefira correção mínima e focada.
- Não invente arquivos fora do diagnóstico/contexto.
- Nunca remova auth, validation de webhook Stripe, ou RLS.
- Nunca inclua secrets no diff.
- Se o incidente for smoke/sintético sem bug real, summary deve dizer isso e files pode ser [].
- NÃO faça commit/PR. Apenas proponha no JSON.`;

function heuristicProposal(contextPack, diagnosis) {
  const hyp = diagnosis?.hypothesis || contextPack?.incident?.title || "sem hipótese";
  const suspects = Array.isArray(diagnosis?.suspect_files)
    ? diagnosis.suspect_files
    : contextPack?.suspectPaths || [];

  return {
    summary: `Proposta rascunho (heurística) para: ${String(hyp).slice(0, 120)}`,
    rationale:
      "Fallback sem Cursor/LLM capaz de gerar diff. Use o diagnóstico e refine manualmente, ou configure CURSOR_API_KEY.",
    confidence: 0.2,
    testPlan: [
      "Revisar diagnóstico no painel",
      "Reproduzir o erro localmente",
      "npm test no backend / npm run test:ci no frontend",
    ],
    files: (suspects || []).slice(0, 3).map((f) => ({
      path: typeof f === "string" ? f : f.path,
      changeType: "modify",
      diff: `# TODO: gerar patch para ${typeof f === "string" ? f : f.path}\n`,
    })),
    model: "heuristic-propose-v1",
    source: "heuristic",
  };
}

/**
 * Gera proposta de correção a partir do diagnóstico.
 */
async function runProposal({ incidentId, diagnosis }) {
  const contextPack = await buildIncidentContext(incidentId);
  const diagnosisPayload = diagnosis
    ? {
        id: diagnosis.id,
        hypothesis: diagnosis.hypothesis,
        confidence: diagnosis.confidence,
        evidence: diagnosis.evidence,
        suspect_files: diagnosis.suspect_files,
        root_cause_category: diagnosis.root_cause_category,
        recommended_next_steps: diagnosis.recommended_next_steps,
        model: diagnosis.model,
      }
    : null;

  let raw;
  if (isCursorConfigured()) {
    try {
      const result = await proposeWithCursor(contextPack, {
        systemPrompt: PROPOSAL_SYSTEM,
        diagnosis: diagnosisPayload,
      });
      raw = {
        summary: result.parsed.summary || result.parsed.hypothesis || "Proposta",
        rationale: result.parsed.rationale || "",
        confidence: Number(result.parsed.confidence ?? 0.4),
        testPlan: Array.isArray(result.parsed.testPlan)
          ? result.parsed.testPlan
          : Array.isArray(result.parsed.test_plan)
            ? result.parsed.test_plan
            : [],
        files: Array.isArray(result.parsed.files) ? result.parsed.files : [],
        model: `cursor:${result.model}`,
        tokenInput: result.tokenInput,
        tokenOutput: result.tokenOutput,
        rawResponse: result.raw,
        source: "cursor",
      };
    } catch (err) {
      const fb = heuristicProposal(contextPack, diagnosisPayload);
      fb.errorMessage = err.message;
      raw = fb;
    }
  } else {
    raw = heuristicProposal(contextPack, diagnosisPayload);
  }

  const classified = classifyProposalFiles(raw.files || []);
  const status = classified.quarantine
    ? "awaiting_approval"
    : "awaiting_approval";

  return {
    status,
    summary: String(raw.summary || "").slice(0, 2000),
    rationale: String(raw.rationale || "").slice(0, 8000),
    testPlan: (raw.testPlan || []).map((s) => String(s).slice(0, 500)).slice(0, 12),
    confidence: Math.max(0, Math.min(1, Number(raw.confidence) || 0.3)),
    riskLevel: classified.riskLevel,
    policyMode: classified.policyMode,
    riskTier: classified.riskTier,
    files: classified.files,
    model: raw.model,
    tokenInput: raw.tokenInput ?? null,
    tokenOutput: raw.tokenOutput ?? null,
    contextPack: {
      incidentId,
      projectSlug: contextPack.project?.slug,
      diagnosisId: diagnosis?.id || null,
      quarantine: classified.quarantine,
    },
    rawResponse: raw.rawResponse || { source: raw.source },
    errorMessage: raw.errorMessage || null,
  };
}

module.exports = {
  runProposal,
  heuristicProposal,
  PROPOSAL_SYSTEM,
};
