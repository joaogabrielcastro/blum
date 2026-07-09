const {
  parseArgs,
  TENANT_SCOPED_TABLES,
} = require("./migrate_tenant_data");

describe("migrate_tenant_data", () => {
  test("parseArgs lê slug, name e dry-run", () => {
    const args = parseArgs([
      "--slug=acme-rep",
      "--name=Acme Representações",
      "--source-slug=default",
      "--rename-source=JW Plataforma",
      "--dry-run",
    ]);
    expect(args.slug).toBe("acme-rep");
    expect(args.name).toBe("Acme Representações");
    expect(args.sourceSlug).toBe("default");
    expect(args.renameSource).toBe("JW Plataforma");
    expect(args.dryRun).toBe(true);
  });

  test("TENANT_SCOPED_TABLES inclui tabelas operacionais", () => {
    expect(TENANT_SCOPED_TABLES).toEqual(
      expect.arrayContaining([
        "clients",
        "products",
        "orders",
        "brands",
        "sales_targets",
      ]),
    );
  });
});
