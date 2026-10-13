import { apiRequest } from "./core";

describe("apiRequest", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("aceita resposta 204 sem tentar converter corpo vazio em JSON", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(null, { status: 204 }),
    );

    await expect(
      apiRequest("/api/v2/products/10", { method: "DELETE" }),
    ).resolves.toBeUndefined();
  });

  it("continua convertendo respostas JSON normais", async () => {
    jest.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    await expect(apiRequest("/api/v2/test")).resolves.toEqual({ ok: true });
  });
});
