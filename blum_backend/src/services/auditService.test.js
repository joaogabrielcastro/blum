jest.mock("../config/database", () => ({
  sql: jest.fn().mockResolvedValue([]),
}));

const { sql } = require("../config/database");
const { logAuditEvent } = require("./auditService");

describe("auditService", () => {
  beforeEach(() => jest.clearAllMocks());

  test("ignora evento sem tenantId", async () => {
    await logAuditEvent({ action: "test" });
    expect(sql).not.toHaveBeenCalled();
  });

  test("insere evento válido", async () => {
    await logAuditEvent({
      tenantId: 1,
      actorUserId: 2,
      action: "auth.login.success",
      resourceType: "user",
      resourceId: "2",
    });
    expect(sql).toHaveBeenCalled();
  });

  test("não propaga erro de banco", async () => {
    sql.mockRejectedValueOnce(new Error("db down"));
    const errSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    await logAuditEvent({ tenantId: 1, action: "x" });
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });
});
