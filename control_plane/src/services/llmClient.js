/**
 * Cliente LLM minimalista (OpenAI-compatible ou Gemini).
 * Sem chave → retorna null (agente usa fallback heurístico).
 */

function getLlmConfig() {
  const apiKey =
    process.env.LLM_API_KEY ||
    process.env.OPENAI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    "";
  if (!apiKey.trim()) {
    return { enabled: false };
  }

  const provider = (
    process.env.LLM_PROVIDER ||
    (process.env.GEMINI_API_KEY && !process.env.OPENAI_API_KEY
      ? "gemini"
      : "openai")
  ).toLowerCase();

  return {
    enabled: true,
    provider,
    apiKey: apiKey.trim(),
    model:
      process.env.LLM_MODEL ||
      (provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini"),
    baseUrl:
      process.env.LLM_BASE_URL ||
      (provider === "openai"
        ? "https://api.openai.com/v1"
        : null),
  };
}

function isLlmConfigured() {
  return getLlmConfig().enabled;
}

async function chatJson({ system, user }) {
  const cfg = getLlmConfig();
  if (!cfg.enabled) {
    return null;
  }

  if (cfg.provider === "gemini") {
    return chatGeminiJson(cfg, { system, user });
  }
  return chatOpenAiJson(cfg, { system, user });
}

async function chatOpenAiJson(cfg, { system, user }) {
  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM OpenAI HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  return {
    parsed: safeParseJson(content),
    raw: data,
    model: cfg.model,
    tokenInput: data.usage?.prompt_tokens ?? null,
    tokenOutput: data.usage?.completion_tokens ?? null,
  };
}

async function chatGeminiJson(cfg, { system, user }) {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(cfg.model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM Gemini HTTP ${res.status}: ${text.slice(0, 400)}`);
  }

  const data = await res.json();
  const content =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") || "{}";
  const usage = data.usageMetadata || {};
  return {
    parsed: safeParseJson(content),
    raw: data,
    model: cfg.model,
    tokenInput: usage.promptTokenCount ?? null,
    tokenOutput: usage.candidatesTokenCount ?? null,
  };
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
    return { hypothesis: String(text).slice(0, 1000), confidence: 0.3 };
  }
}

module.exports = {
  getLlmConfig,
  isLlmConfigured,
  chatJson,
};
