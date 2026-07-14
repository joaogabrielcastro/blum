/**
 * Notificações Telegram (mobile) — opcional.
 * Sem TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID, no-op silencioso.
 */

function getTelegramConfig() {
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(process.env.TELEGRAM_CHAT_ID || "").trim();
  const enabled =
    Boolean(botToken) &&
    Boolean(chatId) &&
    !["0", "false", "off", "no"].includes(
      String(process.env.TELEGRAM_NOTIFY || "true").toLowerCase(),
    );
  return {
    enabled,
    botToken,
    chatId,
    publicUrl: String(
      process.env.CONTROL_PLANE_PUBLIC_URL || "http://localhost:3020",
    ).replace(/\/+$/, ""),
  };
}

function isTelegramConfigured() {
  return getTelegramConfig().enabled;
}

function esc(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramMessage({ text, replyMarkup } = {}) {
  const cfg = getTelegramConfig();
  if (!cfg.enabled) {
    return { sent: false, reason: "telegram_disabled" };
  }
  if (!text) {
    return { sent: false, reason: "empty_text" };
  }

  const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
  const body = {
    chat_id: cfg.chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (replyMarkup) body.reply_markup = replyMarkup;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || payload.ok === false) {
    const err = new Error(
      payload.description || `Telegram HTTP ${res.status}`,
    );
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return { sent: true, messageId: payload.result?.message_id };
}

function panelKeyboard(cfg) {
  return {
    inline_keyboard: [
      [{ text: "Abrir Control Plane", url: `${cfg.publicUrl}/` }],
    ],
  };
}

/**
 * Proposta pronta para HITL.
 */
async function notifyProposalAwaitingApproval({
  proposal,
  incident,
  projectSlug,
}) {
  if (!isTelegramConfigured()) return { sent: false };
  const cfg = getTelegramConfig();
  const title = incident?.title || "Incidente";
  const summary = proposal?.summary || "(sem resumo)";
  const risk = proposal?.risk_tier || proposal?.risk_level || "?";
  const conf = Math.round(Number(proposal?.confidence || 0) * 100);

  const text = [
    "<b>🛠 Proposta aguardando aprovação</b>",
    "",
    `<b>Projeto:</b> ${esc(projectSlug || "—")}`,
    `<b>Incidente:</b> ${esc(title)}`,
    `<b>Risco:</b> ${esc(risk)} · conf ${conf}%`,
    "",
    esc(String(summary).slice(0, 400)),
    "",
    `ID proposta: <code>${esc(proposal?.id)}</code>`,
    "Abra o painel, revise o diff e aprove ou rejeite.",
  ].join("\n");

  try {
    return await sendTelegramMessage({
      text,
      replyMarkup: panelKeyboard(cfg),
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "telegram_notify_failed",
        kind: "proposal_awaiting_approval",
        error: err.message,
      }),
    );
    return { sent: false, error: err.message };
  }
}

async function notifyPrOpened({ proposal, incident, projectSlug }) {
  if (!isTelegramConfigured()) return { sent: false };
  const text = [
    "<b>✅ PR aberta (após approve)</b>",
    "",
    `<b>Projeto:</b> ${esc(projectSlug || "—")}`,
    `<b>Incidente:</b> ${esc(incident?.title || "—")}`,
    proposal?.pr_url
      ? `<b>PR:</b> ${esc(proposal.pr_url)}`
      : "<b>PR:</b> (sem URL)",
    `CI: ${esc(proposal?.ci_status || "pending")}`,
    "",
    "Revise e faça merge no GitHub — o agente <b>não</b> mergeia.",
  ].join("\n");

  try {
    const cfg = getTelegramConfig();
    const keyboard = proposal?.pr_url
      ? {
          inline_keyboard: [
            [{ text: "Abrir PR", url: proposal.pr_url }],
            [{ text: "Abrir painel", url: `${cfg.publicUrl}/` }],
          ],
        }
      : panelKeyboard(cfg);
    return await sendTelegramMessage({ text, replyMarkup: keyboard });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "telegram_notify_failed",
        kind: "pr_opened",
        error: err.message,
      }),
    );
    return { sent: false, error: err.message };
  }
}

async function notifyPrOutcome({ proposal, incident, projectSlug, kind }) {
  if (!isTelegramConfigured()) return { sent: false };
  const labels = {
    failed: "❌ Falha ao abrir PR",
    skipped: "⏭ PR omitida",
  };
  const text = [
    `<b>${labels[kind] || "PR"}</b>`,
    "",
    `<b>Projeto:</b> ${esc(projectSlug || "—")}`,
    `<b>Incidente:</b> ${esc(incident?.title || "—")}`,
    esc(proposal?.pr_error || ""),
  ].join("\n");

  try {
    return await sendTelegramMessage({
      text,
      replyMarkup: panelKeyboard(getTelegramConfig()),
    });
  } catch (err) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "telegram_notify_failed",
        kind: `pr_${kind}`,
        error: err.message,
      }),
    );
    return { sent: false, error: err.message };
  }
}

async function sendTelegramTestMessage() {
  const cfg = getTelegramConfig();
  if (!cfg.enabled) {
    const err = new Error(
      "Telegram não configurado (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID)",
    );
    err.status = 400;
    throw err;
  }
  return sendTelegramMessage({
    text: [
      "<b>Control Plane — teste OK</b>",
      "",
      `Painel: ${esc(cfg.publicUrl)}`,
      "Notificações de proposta/PR estão ativas.",
    ].join("\n"),
    replyMarkup: panelKeyboard(cfg),
  });
}

module.exports = {
  getTelegramConfig,
  isTelegramConfigured,
  sendTelegramMessage,
  notifyProposalAwaitingApproval,
  notifyPrOpened,
  notifyPrOutcome,
  sendTelegramTestMessage,
};
