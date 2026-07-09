/**
 * E-mail transacional opcional (Resend API ou log em dev).
 * Defina RESEND_API_KEY e EMAIL_FROM para envio real.
 */

const RESEND_API = "https://api.resend.com/emails";

function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
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
  const base = process.env.FRONTEND_URL || "https://blum.jwsoftware.com.br";
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
  return sendEmail({
    to,
    subject: `Blum — falha no pagamento (${companyName})`,
    html: `<p>O pagamento da assinatura Blum para <strong>${companyName}</strong> falhou.</p>
<p>Atualize o método de pagamento em Assinatura para evitar interrupção do serviço.</p>`,
    text: `Falha no pagamento Blum para ${companyName}. Atualize em Assinatura.`,
  });
}

module.exports = {
  isEmailConfigured,
  sendEmail,
  sendWelcomeEmail,
  sendPaymentFailedEmail,
};
