describe("cursorClient + provider selection", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.CURSOR_API_KEY;
    delete process.env.CURSOR_REPO_URL;
    delete process.env.DIAGNOSIS_PROVIDER;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.LLM_API_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("resolveRepoUrl monta github a partir de repo_full_name", () => {
    const { resolveRepoUrl } = require("./cursorClient");
    expect(
      resolveRepoUrl({
        project: { repoFullName: "acme/blum" },
      }),
    ).toBe("https://github.com/acme/blum");
  });

  test("safeParseJson extrai objeto embutido", () => {
    const { safeParseJson } = require("./cursorClient");
    const parsed = safeParseJson('ok\n{"hypothesis":"x","confidence":0.5}\n');
    expect(parsed.hypothesis).toBe("x");
    expect(parsed.confidence).toBe(0.5);
  });

  test("getDiagnosisProvider prioriza cursor quando há chave", () => {
    process.env.CURSOR_API_KEY = "cursor_test";
    const { getDiagnosisProvider, isCursorConfigured } = require("./diagnoseAgent");
    expect(isCursorConfigured()).toBe(true);
    expect(getDiagnosisProvider()).toBe("cursor");
  });

  test("getCursorConfig desligado sem chave", () => {
    const { isCursorConfigured, getCursorConfig } = require("./cursorClient");
    expect(isCursorConfigured()).toBe(false);
    expect(getCursorConfig().enabled).toBe(false);
  });

  test("DIAGNOSIS_PROVIDER=heuristic força fallback", () => {
    process.env.CURSOR_API_KEY = "cursor_test";
    process.env.DIAGNOSIS_PROVIDER = "heuristic";
    const { getDiagnosisProvider } = require("./diagnoseAgent");
    expect(getDiagnosisProvider()).toBe("heuristic");
  });
});
