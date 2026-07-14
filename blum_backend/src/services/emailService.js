/**
 * E-mail transacional opcional (Resend API ou log em dev).
 * Defina RESEND_API_KEY e EMAIL_FROM para envio real.
 */

const RESEND_API = "https://api.resend.com/emails";

function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function frontendBase() {
  return process.env.FRONTEND_URL || "https://blum.jwsoftware.com.br";
}

async function sendEmail({ to, subject, html, text }) {
  const recipients = Array.isArray(to) ? to : [to];
  const valid = recipients.filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e)));
  if (!valid.length) {
    console.warn("[email] destinatário inválido, ignorado:", to);
    return { sent: false, reason: "invalid_recipient" };
  }

  if (!isEmailConfigured()) {
    console.log("[email] (dev) Para:", valid.join(", "), "|", subject);
    return { sent: false, reason: "not_configured" };
  }

  const response = await fetch(RESEND_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM,
      to: valid,
      subject,
      html: html || undefined,
      text: text || undefined,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error("[email] falha Resend:", response.status, body);
    return { sent: false, reason: "provider_error" };
  }

  return { sent: true };
}

async function sendWelcomeEmail({ to, companyName, tenantSlug }) {
  const base = frontendBase();
  const loginUrl =
    tenantSlug && tenantSlug !== "default"
      ? `https://${tenantSlug}.${process.env.TENANT_BASE_DOMAIN || "blum.jwsoftware.com.br"}/login`
      : `${base}/login`;

  return sendEmail({
    to,
    subject: `Bem-vindo ao Blum — ${companyName}`,
    html: `<p>Olá,</p>
<p>A empresa <strong>${companyName}</strong> foi criada no Blum.</p>
<p><a href="${loginUrl}">Aceder ao painel</a></p>
<p>Complete a assinatura Starter para ativar todos os recursos.</p>`,
    text: `Bem-vindo ao Blum. Empresa ${companyName}. Login: ${loginUrl}`,
  });
}

async function sendPaymentFailedEmail({ to, companyName }) {
  const url = `${frontendBase()}/subscription`;
  return sendEmail({
    to,
    subject: `Blum — falha no pagamento (${companyName})`,
    html: `<p>O pagamento da assinatura Blum para <strong>${companyName}</strong> falhou.</p>
<p><a href="${url}">Atualize o método de pagamento em Assinatura</a> para evitar interrupção do serviço.</p>`,
    text: `Falha no pagamento Blum para ${companyName}. Atualize em ${url}`,
  });
}

async function sendSubscriptionActivatedEmail({ to, companyName, planName }) {
  const url = `${frontendBase()}/subscription`;
  const plan = planName || "seu plano";
  return sendEmail({
    to,
    subject: `Blum — assinatura ativa (${companyName})`,
    html: `<p>A assinatura Blum da empresa <strong>${companyName}</strong> está ativa (${plan}).</p>
<p><a href="${url}">Ver detalhes da assinatura</a></p>`,
    text: `Assinatura Blum ativa para ${companyName} (${plan}). ${url}`,
  });
}

async function sendSubscriptionCanceledEmail({ to, companyName, endsAtLabel }) {
  const url = `${frontendBase()}/subscription`;
  const ends =
    endsAtLabel != null
      ? `<p>O acesso permanece disponível até <strong>${endsAtLabel}</strong>, se aplicável.</p>`
      : "";
  return sendEmail({
    to,
    subject: `Blum — assinatura cancelada (${companyName})`,
    html: `<p>A assinatura Blum de <strong>${companyName}</strong> foi cancelada.</p>
${ends}
<p><a href="${url}">Reativar em Assinatura</a></p>`,
    text: `Assinatura Blum cancelada para ${companyName}. Reative em ${url}`,
  });
}

async function sendTrialEndingEmail({ to, companyName, trialEndsAtLabel }) {
  const url = `${frontendBase()}/subscription`;
  return sendEmail({
    to,
    subject: `Blum — período de teste a terminar (${companyName})`,
    html: `<p>O período de teste da empresa <strong>${companyName}</strong> termina em <strong>${trialEndsAtLabel || "breve"}</strong>.</p>
<p><a href="${url}">Escolha um plano</a> para continuar sem interrupção.</p>`,
    text: `Trial Blum de ${companyName} termina em ${trialEndsAtLabel || "breve"}. Assine em ${url}`,
  });
}

module.exports = {
  isEmailConfigured,
  sendEmail,
  sendWelcomeEmail,
  sendPaymentFailedEmail,
  sendSubscriptionActivatedEmail,
  sendSubscriptionCanceledEmail,
  sendTrialEndingEmail,
};
