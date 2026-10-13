const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("./config/env");
const { rateLimitKey } = require("./createApp");

describe("rateLimitKey", () => {
  test("ignora JWT sem assinatura válida e X-Forwarded-For informado pelo cliente", () => {
    const forged = jwt.sign(
      { userId: 999, tenantId: 999 },
      "segredo-incorreto-com-tamanho-suficiente",
    );
    const req = {
      headers: {
        authorization: `Bearer ${forged}`,
        "x-forwarded-for": "203.0.113.10",
      },
      ip: "198.51.100.20",
      socket: {},
    };

    expect(rateLimitKey(req)).toBe("198.51.100.20");
  });

  test("usa tenant e usuário apenas quando o JWT é autêntico", () => {
    const token = jwt.sign(
      { userId: 7, tenantId: 3 },
      getJwtSecret(),
    );
    const req = {
      headers: { authorization: `Bearer ${token}` },
      ip: "198.51.100.20",
      socket: {},
    };

    expect(rateLimitKey(req)).toBe("user:3:7");
  });
});
