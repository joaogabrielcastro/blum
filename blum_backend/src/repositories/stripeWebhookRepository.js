const { sql } = require("../config/database");

async function hasProcessedEvent(eventId) {
  const rows = await sql`
    SELECT id FROM stripe_webhook_events WHERE id = ${eventId} LIMIT 1
  `;
  return rows.length > 0;
}

async function markEventProcessed(eventId, eventType) {
  await sql`
    INSERT INTO stripe_webhook_events (id, event_type)
    VALUES (${eventId}, ${eventType})
    ON CONFLICT (id) DO NOTHING
  `;
}

module.exports = {
  hasProcessedEvent,
  markEventProcessed,
};
