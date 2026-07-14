const { matchTier, classifyProposalFiles } = require("./policyEngine");

describe("policyEngine", () => {
  test("stripe e auth são CRITICAL", () => {
    expect(matchTier("blum_backend/src/services/stripe/webhook.js").tier).toBe(
      "CRITICAL",
    );
    expect(matchTier("blum_backend/src/middleware/authMiddleware.js").tier).toBe(
      "CRITICAL",
    );
  });

  test("plans é HIGH", () => {
    expect(matchTier("blum_backend/src/config/plans.js").tier).toBe("HIGH");
  });

  test("testes são LOW", () => {
    expect(matchTier("blum_backend/src/foo.test.js").tier).toBe("LOW");
  });

  test("classifyProposalFiles eleva para CRITICAL com secret", () => {
    const result = classifyProposalFiles([
      {
        path: "blum_frontend/src/utils/format.js",
        diff: "--- a\n+++ b\n+const x = process.env.JWT_SECRET\n",
      },
    ]);
    expect(result.riskTier).toBe("CRITICAL");
    expect(result.quarantine).toBe(true);
    expect(result.requiresHumanApproval).toBe(true);
  });
});
