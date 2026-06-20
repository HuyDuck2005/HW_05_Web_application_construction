import amqp from "amqplib";
import { once } from "node:events";

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://app:app123@localhost:5672";
const EXCHANGE = process.env.CHAT_EVENTS_EXCHANGE ?? "chat.events";
const EXCHANGE_TYPE = process.env.CHAT_EVENTS_EXCHANGE_TYPE ?? "topic";

let connection;
let channel;

export async function connectChatEventPublisher() {
  if (channel) {
    return channel;
  }
  connection = await amqp.connect(RABBITMQ_URL);
  connection.on("error", (error) => {
    console.error("[chat-event-publisher] connection error: ", error.message);
  });
  connection.on("close", () => {
    console.error("[chat-event-publisher] connection closed");
    connection = null;
    channel = null;
  });

  channel = await connection.createConfirmChannel();
  await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, {
    durable: true,
  });
  console.log(`[chat-event-publisher] connected exchange=${EXCHANGE}`);
  return channel;
}

export async function publishChatEvent({ routingKey, event }) {
  const ch = await connectChatEventPublisher();
  const ok = ch.publish(
    EXCHANGE,
    routingKey,
    Buffer.from(JSON.stringify(event), "utf8"),
    {
      persistent: true,
      contentType: "application/json",
      messageId: event.eventId,
      type: event.eventType,
      timestamp: Math.floor(Date.now() / 1000),
      headers: {
        eventId: event.eventId,
        eventType: event.eventType,
        version: event.version,
        correlationId: event.correlationId ?? "",
      },
    }
  );

  if (!ok) {
    await once(ch, "drain");
  }
  await ch.waitForConfirms();
}

export async function closeChatEventPublisher() {
  if (channel) {
    await channel.close();
  }
  if (connection) {
    await connection.close();
    channel = null;
    connection = null;
  }
}
