const {
  buildFingerprint,
  normalizeSeverity,
  createIngestToken,
  sha256,
} = require("./fingerprint");
const {
  fromGeneric,
  fromSentryWebhook,
  normalizeIngestPayload,
} = require("./normalizers");

describe("fingerprint", () => {
  test("normalizeSeverity mapeia níveis", () => {
    expect(normalizeSeverity("fatal")).toBe("critical");
    expect(normalizeSeverity("warn")).toBe("warning");
    expect(normalizeSeverity("x")).toBe("error");
  });

  test("buildFingerprint é estável para mesmos campos", () => {
    const a = buildFingerprint({
      exceptionType: "TypeError",
      culprit: "/api/v2/orders",
      filename: "orderService.js",
      functionName: "create",
      environment: "production",
    });
    const b = buildFingerprint({
      exceptionType: "TypeError",
      culprit: "/api/v2/orders",
      filename: "orderService.js",
      functionName: "create",
      environment: "production",
    });
    expect(a).toBe(b);
    expect(a).toHaveLength(32);
  });

  test("createIngestToken gera hash verificável", () => {
    const t = createIngestToken();
    expect(t.token.startsWith("icp_")).toBe(true);
    expect(t.hash).toBe(sha256(t.token));
    expect(t.prefix).toBe(t.token.slice(0, 12));
  });
});

describe("normalizers", () => {
  test("fromGeneric usa title/message", () => {
    const n = fromGeneric({
      title: "Falha ao criar pedido",
      message: "stock insufficient",
      severity: "error",
      culprit: "orderRoutes.js",
    });
    expect(n.title).toContain("Falha");
    expect(n.source).toBe("generic");
    expect(n.fingerprint).toBeTruthy();
  });

  test("fromSentryWebhook extrai issue/event", () => {
    const n = fromSentryWebhook({
      action: "created",
      data: {
        issue: {
          id: "123",
          title: "TypeError: x is not a function",
          culprit: "src/App.jsx",
          level: "error",
          permalink: "https://sentry.io/issues/123",
        },
        event: {
          environment: "production",
          release: "blum-frontend@abc",
          exception: {
            values: [
              {
                type: "TypeError",
                value: "x is not a function",
                stacktrace: {
                  frames: [
                    {
                      filename: "src/App.jsx",
                      function: "render",
                      lineno: 10,
                      in_app: true,
                    },
                  ],
                },
              },
            ],
          },
        },
      },
    });
    expect(n.source).toBe("sentry");
    expect(n.title).toContain("TypeError");
    expect(n.environment).toBe("production");
    expect(n.metadata.extra.issueId).toBe("123");
  });

  test("normalizeIngestPayload escolhe sentry por shape", () => {
    const n = normalizeIngestPayload("generic", {
      action: "triggered",
      data: { issue: { id: "9", title: "boom" } },
    });
    expect(n.source).toBe("sentry");
  });
});
