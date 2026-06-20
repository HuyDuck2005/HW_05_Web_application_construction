import { randomUUID } from "node:crypto";
import db from "./db.js";

export async function findDirectConversationBetween(studentAId, studentBId) {
  const row = await db("conversation_members as cm1")
    .join("conversation_members as cm2", "cm1.conversation_id", "cm2.conversation_id")
    .join("conversations as c", "c.id", "cm1.conversation_id")
    .select("c.id", "c.type", "c.created_at", "c.updated_at")
    .where("c.type", "direct")
    .where("cm1.student_id", studentAId)
    .where("cm2.student_id", studentBId)
    .first();
  return row ?? null;
}

export async function createDirectConversation(studentAId, studentBId) {
  return db.transaction(async (trx) => {
    const conversationId = randomUUID();
    const [conversation] = await trx("conversations")
      .insert({
        id: conversationId,
        type: "direct"
      })
      .returning(["id", "type", "created_at", "updated_at"]);

    await trx("conversation_members").insert([
      {
        conversation_id: conversationId,
        student_id: studentAId
      },
      {
        conversation_id: conversationId,
        student_id: studentBId
      }
    ]);

    return conversation;
  });
}

export async function listConversationsByStudent(studentId) {
  return db("conversations as c")
    .join("conversation_members as cm", "cm.conversation_id", "c.id")
    .select("c.id", "c.type", "c.created_at", "c.updated_at")
    .where("cm.student_id", studentId)
    .orderBy("c.updated_at", "desc");
}

export async function isConversationMember(conversationId, studentId) {
  const row = await db("conversation_members")
    .select("conversation_id")
    .where({
      conversation_id: conversationId,
      student_id: studentId,
    })
    .first();
  return Boolean(row);
}

export async function listMessages(
  conversationId,
  { limit = 50, before = null } = {},
) {
  let query = db("messages")
    .select("id", "conversation_id", "sender_id", "content", "created_at")
    .where({ conversation_id: conversationId })
    .orderBy("created_at", "desc")
    .limit(limit);

  if (before) {
    query = query.andWhere("created_at", "<", before);
  }

  const rows = await query;

  return rows.reverse();
}

export async function createMessageWithOutbox({
  conversationId,
  senderId,
  content,
  correlationId = null,
}) {
  return db.transaction(async (trx) => {
    const messageId = randomUUID();

    const [message] = await trx("messages")
      .insert({
        id: messageId,
        conversation_id: conversationId,
        sender_id: senderId,
        content,
      })
      .returning([
        "id",
        "conversation_id",
        "sender_id",
        "content",
        "created_at",
      ]);

    await trx("conversations").where({ id: conversationId }).update({
      updated_at: trx.fn.now(),
    });

    const eventId = randomUUID();

    await trx("outbox_events").insert({
      id: eventId,
      event_type: "ChatMessageCreated",
      routing_key: "chat.message.created",
      version: 1,
      correlation_id: correlationId,
      payload: {
        messageId: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        content: message.content,
        createdAt: message.created_at,
      },
      status: "pending",
      attempts: 0,
    });

    return message;
  });
}
