import amqp from "amqplib";
import { pubsub, EVENTS } from "./pubsub.js";

const RABBITMQ_URL = process.env.RABBITMQ_URL ?? "amqp://app:app123@localhost:5672";
const EXCHANGE = process.env.CHAT_EVENTS_EXCHANGE ?? "chat_events";
const EXCHANGE_TYPE = process.env.CHAT_EVENTS_EXCHANGE_TYPE ?? "topic";
const ROUTING_KEY = process.env.CHAT_MESSAGE_CREATED_ROUTING_KEY ?? "chat.message.created";
const QUEUE = process.env.CHAT_GATEWAY_QUEUE ?? "graphql_gateway_chat_message_created_queue";

let connection;
let channel;

function mapChatMessage(event) {
  return {
    id: event.payload.messageId,
    conversationId: event.payload.conversationId,
    senderId: event.payload.senderId,
    content: event.payload.content,
    createdAt: event.payload.createdAt,
  };
}

export async function startChatEventsConsumer() {
  try {
    connection = await amqp.connect(RABBITMQ_URL);
    connection.on("error", (err) => console.error("[chatEventsConsumer] error", err));
    connection.on("close", () => console.error("[chatEventsConsumer] close"));

    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });
    await channel.assertQueue(QUEUE, { durable: true, arguments: { "x-queue-type": "quorum" } });
    await channel.bindQueue(QUEUE, EXCHANGE, ROUTING_KEY);

    await channel.consume(
      QUEUE,
      (msg) => {
        if (!msg) return;
        try {
          const event = JSON.parse(msg.content.toString());
          const chatMessage = mapChatMessage(event);
          pubsub.publish(EVENTS.CHAT_MESSAGE_CREATED, {
            chatMessageCreated: chatMessage,
          });
          channel.ack(msg);
        } catch (e) {
          console.error(e);
          channel.nack(msg, false, false);
        }
      },
      { noAck: false }
    );
    console.log(`[chatEventsConsumer] Listening on queue ${QUEUE}`);
  } catch (err) {
    console.error("[chatEventsConsumer] Error starting:", err);
  }
}

export async function stopChatEventsConsumer() {
  if (channel) await channel.close();
  if (connection) await connection.close();
}
