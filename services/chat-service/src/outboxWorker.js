import "dotenv/config";
import {
  markOutboxEventFailed,
  markOutboxEventPublished,
  reservePendingOutboxEvents,
  resetStuckPublishingEvents,
} from "./outboxEventRepository.js";
import {
  closeChatEventPublisher,
  connectChatEventPublisher,
  publishChatEvent,
} from "./rabbitmqPublisher.js";

const POLL_INTERVAL_MS = Number(process.env.CHAT_OUTBOX_POLL_INTERVAL_MS ?? 2000);
const BATCH_SIZE = Number(process.env.CHAT_OUTBOX_BATCH_SIZE ?? 20);

let shouldStop = false;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildEvent(row) {
  return {
    eventId: row.id,
    eventType: row.event_type,
    occurredAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
    version: row.version ?? 1,
    correlationId: row.correlation_id ?? null,
    payload: row.payload,
  };
}

async function processRow(row) {
  try {
    const event = buildEvent(row);
    await publishChatEvent({
      routingKey: row.routing_key,
      event,
    });
    await markOutboxEventPublished(row.id);
    console.log(`[chat-outbox-worker] published eventId=${row.id} type=${row.event_type}`);
  } catch (error) {
    console.error(`[chat-outbox-worker] failed eventId=${row.id}`, error.message);
    await markOutboxEventFailed(row.id, error);
  }
}

async function run() {
  console.log("[chat-outbox-worker] starting...");
  await connectChatEventPublisher();
  await resetStuckPublishingEvents();
  
  while (!shouldStop) {
    const rows = await reservePendingOutboxEvents(BATCH_SIZE);
    
    if (rows.length === 0) {
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    
    for (const row of rows) {
      await processRow(row);
    }
  }
}

async function shutdown() {
  shouldStop = true;
  await closeChatEventPublisher();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

run().catch(async (error) => {
  console.error("[chat-outbox-worker] fatal error:", error);
  await closeChatEventPublisher();
  process.exit(1);
});
