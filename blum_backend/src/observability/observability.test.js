/**
 * Testes da camada de observabilidade (sem DSN = no-op).
 */

describe("observability", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.SENTRY_DSN;
    delete process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    delete process.env.SENTRY_RELEASE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test("sem DSN nem OTEL, status fica desligado", () => {
    const {
      isSentryConfigured,
      isOtelConfigured,
      getObservabilityStatus,
    } = require("./index");
    expect(isSentryConfigured()).toBe(false);
    expect(isOtelConfigured()).toBe(false);
    expect(getObservabilityStatus()).toEqual({ sentry: false, otel: false });
  });

  test("initSentry sem DSN não lança", () => {
    const { initSentry } = require("./index");
    expect(() => initSentry()).not.toThrow();
    expect(initSentry()).toEqual({ enabled: false });
  });

  test("getRelease usa SENTRY_RELEASE quando definido", () => {
    process.env.SENTRY_RELEASE = "blum-backend@abc123";
    const { getRelease } = require("./index");
    expect(getRelease()).toBe("blum-backend@abc123");
  });
});
