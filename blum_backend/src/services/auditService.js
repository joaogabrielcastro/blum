const { sql } = require("../config/database");

async function logAuditEvent({
  tenantId,
  actorUserId = null,
  action,
  resourceType = null,
  resourceId = null,
  requestId = null,
  metadata = null,
}) {
  if (!tenantId || !action) return;
  try {
    await sql`
      INSERT INTO audit_logs (
        tenant_id, actor_user_id, action, resource_type, resource_id, request_id, metadata
      )
      VALUES (
        ${tenantId}, ${actorUserId}, ${action}, ${resourceType}, ${resourceId}, ${requestId}, ${metadata}
      )
    `;
  } catch (error) {
    console.error("audit log error:", error.message);
  }
}

module.exports = { logAuditEvent };
