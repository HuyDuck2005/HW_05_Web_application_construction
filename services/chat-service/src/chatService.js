import * as chatRepository from "./chatRepository.js";

export async function getOrCreateDirectConversation({
  currentStudentId,
  targetStudentId,
}) {
  if (!currentStudentId) {
    throw new Error("CURRENT_STUDENT_REQUIRED");
  }

  if (!targetStudentId) {
    throw new Error("TARGET_STUDENT_REQUIRED");
  }

  if (currentStudentId === targetStudentId) {
    throw new Error("CANNOT_CHAT_WITH_SELF");
  }

  const existing = await chatRepository.findDirectConversationBetween(
    currentStudentId,
    targetStudentId,
  );

  if (existing) {
    return existing;
  }

  return chatRepository.createDirectConversation(
    currentStudentId,
    targetStudentId,
  );
}

export async function listMyConversations(studentId) {
  return chatRepository.listConversationsByStudent(studentId);
}

export async function getMessages({
  currentStudentId,
  conversationId,
  limit,
  before,
}) {
  const isMember = await chatRepository.isConversationMember(
    conversationId,
    currentStudentId,
  );

  if (!isMember) {
    throw new Error("FORBIDDEN_CONVERSATION");
  }

  return chatRepository.listMessages(conversationId, {
    limit,
    before,
  });
}

export async function sendMessage({
  currentStudentId,
  conversationId,
  content,
  correlationId = null,
}) {
  const cleanContent = String(content ?? "").trim();

  if (!cleanContent) {
    throw new Error("MESSAGE_CONTENT_REQUIRED");
  }

  if (cleanContent.length > 2000) {
    throw new Error("MESSAGE_TOO_LONG");
  }

  return chatRepository.createMessageWithOutbox({
    conversationId,
    senderId: currentStudentId,
    content: cleanContent,
    correlationId,
  });
}

export async function isConversationMember(conversationId, studentId) {
  return chatRepository.isConversationMember(conversationId, studentId);
}
