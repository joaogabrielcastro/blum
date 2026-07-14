const { extractSuspectPaths } = require("./contextBuilder");
const { heuristicDiagnosis } = require("./diagnoseAgent");

describe("contextBuilder", () => {
  test("extractSuspectPaths lê stack e aplica heurísticas Blum", () => {
    const paths = extractSuspectPaths({
      culprit: "orderService.js",
      stack: "blum_backend/src/services/orderService.js:42 in create\nnode_modules/x.js:1 in y",
      exceptionType: "TypeError",
    });
    expect(paths.some((p) => p.includes("orderService.js"))).toBe(true);
    expect(paths.every((p) => !p.includes("node_modules"))).toBe(true);
  });

  test("heurística jwt aponta authMiddleware", () => {
    const paths = extractSuspectPaths({
      culprit: "/api/v2/auth/login",
      exceptionType: "JsonWebTokenError",
    });
    expect(paths).toContain("blum_backend/src/middleware/authMiddleware.js");
  });
});

describe("diagnoseAgent heuristic", () => {
  test("classifica TypeError como bug", () => {
    const result = heuristicDiagnosis({
      incident: {
        title: "TypeError: x is not a function",
        message: "Cannot read properties of undefined",
        culprit: "App.jsx",
        eventCount: 3,
        environment: "development",
        metadata: { exceptionType: "TypeError" },
      },
      project: { slug: "blum" },
      suspectPaths: ["blum_frontend/src/App.jsx"],
      similarIncidents: [],
      builtAt: new Date().toISOString(),
    });

    expect(result.rootCauseCategory).toBe("bug");
    expect(result.confidence).toBeGreaterThan(0.3);
    expect(result.hypothesis).toBeTruthy();
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.recommendedNextSteps.length).toBeGreaterThan(0);
    expect(result.model).toBe("heuristic-v1");
  });

  test("classifica stripe como billing", () => {
    const result = heuristicDiagnosis({
      incident: {
        title: "Stripe webhook signature invalid",
        message: "webhook error",
        culprit: "stripeWebhookController",
        metadata: {},
      },
      project: { slug: "blum" },
      suspectPaths: [],
      similarIncidents: [],
    });
    expect(result.rootCauseCategory).toBe("billing");
  });
});
