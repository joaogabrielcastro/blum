const {
  parseArgs,
  normalizeEmailLocalPart,
  buildTenantEmail,
  planEmailUpdates,
} = require("./normalize_tenant_emails");

describe("normalize_tenant_emails", () => {
  test("parseArgs lê tenant, domain e dry-run", () => {
    const args = parseArgs([
      "--tenant=blu1m",
      "--domain=blu1m.com",
      "--dry-run",
    ]);
    expect(args.tenant).toBe("blu1m");
    expect(args.domain).toBe("blu1m.com");
    expect(args.dryRun).toBe(true);
  });

  test("normalizeEmailLocalPart trata maiúsculas e e-mail existente", () => {
    expect(normalizeEmailLocalPart("Siane")).toBe("siane");
    expect(normalizeEmailLocalPart("eduardo@gmail.com")).toBe("eduardo");
  });

  test("buildTenantEmail monta @dominio", () => {
    expect(buildTenantEmail("Antonio", "blu1m.com")).toBe("antonio@blu1m.com");
    expect(buildTenantEmail("admin", "blu1m.com")).toBe("admin@blu1m.com");
  });

  test("planEmailUpdates detecta skip, update e conflito", () => {
    const { planned, conflicts } = planEmailUpdates(
      [
        { id: 1, username: "siane", role: "salesperson", name: "Siane" },
        { id: 2, username: "Siane", role: "salesperson", name: "Siane 2" },
        { id: 3, username: "eduardo@blu1m.com", role: "admin", name: "Eduardo" },
      ],
      "blu1m.com",
    );

    expect(planned.find((p) => p.id === 1)?.action).toBe("update");
    expect(planned.find((p) => p.id === 2)?.action).toBe("update");
    expect(planned.find((p) => p.id === 3)?.action).toBe("skip");
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].email).toBe("siane@blu1m.com");
  });
});
