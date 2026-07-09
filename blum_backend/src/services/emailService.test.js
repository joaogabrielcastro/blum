const {
  isEmailConfigured,
  sendEmail,
  sendWelcomeEmail,
  sendPaymentFailedEmail,
} = require("./emailService");

describe("emailService", () => {
  const origResend = process.env.RESEND_API_KEY;
  const origFrom = process.env.EMAIL_FROM;

  afterEach(() => {
    if (origResend === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = origResend;
    if (origFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = origFrom;
    global.fetch = undefined;
  });

  test("isEmailConfigured exige RESEND e FROM", () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    expect(isEmailConfigured()).toBe(false);

    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Blum <noreply@test.com>";
    expect(isEmailConfigured()).toBe(true);
  });

  test("sendEmail sem config loga em dev", async () => {
    delete process.env.RESEND_API_KEY;
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    const result = await sendEmail({
      to: "user@test.com",
      subject: "Teste",
      text: "oi",
    });
    expect(result.sent).toBe(false);
    expect(result.reason).toBe("not_configured");
    log.mockRestore();
  });

  test("sendEmail chama Resend quando configurado", async () => {
    process.env.RESEND_API_KEY = "re_test";
    process.env.EMAIL_FROM = "Blum <noreply@test.com>";
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    const result = await sendEmail({
      to: "user@test.com",
      subject: "Olá",
      html: "<p>oi</p>",
    });

    expect(result.sent).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("sendWelcomeEmail monta assunto com empresa", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    await sendWelcomeEmail({
      to: "a@test.com",
      companyName: "Acme",
      tenantSlug: "acme",
    });
    const output = log.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(output).toMatch(/Acme/);
    log.mockRestore();
  });

  test("sendPaymentFailedEmail monta assunto", async () => {
    const log = jest.spyOn(console, "log").mockImplementation(() => {});
    await sendPaymentFailedEmail({ to: "a@test.com", companyName: "Acme" });
    const output = log.mock.calls.map((c) => c.join(" ")).join(" ");
    expect(output).toMatch(/falha/i);
    log.mockRestore();
  });
});
