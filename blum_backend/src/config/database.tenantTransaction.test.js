const { beginTenantTransaction, runWithDbContext, pool } = require("./database");

function fakeClient() {
  return { query: jest.fn().mockResolvedValue({ rows: [] }) };
}

describe("beginTenantTransaction", () => {
  afterAll(() => pool.end());

  test("aplica o tenant do pedido depois do BEGIN", async () => {
    const client = fakeClient();
    await runWithDbContext({ tenantId: 7 }, () =>
      beginTenantTransaction(client),
    );

    const calls = client.query.mock.calls;
    expect(calls[0][0]).toBe("BEGIN");
    expect(calls).toContainEqual([
      "SELECT set_config('app.bypass_rls', 'false', true)",
    ]);
    expect(calls).toContainEqual([
      "SELECT set_config('app.tenant_id', $1, true)",
      ["7"],
    ]);
  });

  test("aplica bypass de RLS quando o contexto pede", async () => {
    const client = fakeClient();
    await runWithDbContext({ bypassRls: true }, () =>
      beginTenantTransaction(client),
    );

    const sqls = client.query.mock.calls.map((c) => c[0]);
    expect(sqls[0]).toBe("BEGIN");
    expect(sqls).toContain("SELECT set_config('app.bypass_rls', 'true', true)");
  });

  test("sem contexto (scripts/CLI) só abre a transação", async () => {
    const client = fakeClient();
    await beginTenantTransaction(client);
    expect(client.query.mock.calls).toEqual([["BEGIN"]]);
  });
});
