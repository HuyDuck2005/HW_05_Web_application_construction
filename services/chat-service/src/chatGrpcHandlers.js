import {
  getMessages,
  getOrCreateDirectConversation,
  isConversationMember,
  listMyConversations,
  sendMessage,
} from "./chatService.js";

function mapConversation(row) {
  return {
    id: row.id,
    type: row.type,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
  };
}

function mapMessage(row) {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

function handleGrpcError(callback, error) {
  callback({
    code: 13,
    message: error.message,
  });
}

export const chatGrpcHandlers = {
  async GetOrCreateDirectConversation(call, callback) {
    try {
      const conversation = await getOrCreateDirectConversation({
        currentStudentId: call.request.currentStudentId,
        targetStudentId: call.request.targetStudentId,
      });
      callback(null, {
        conversation: mapConversation(conversation),
      });
    } catch (error) {
      handleGrpcError(callback, error);
    }
  },

  async ListMyConversations(call, callback) {
    try {
      const conversations = await listMyConversations(call.request.studentId);
      callback(null, {
        conversations: conversations.map(mapConversation),
      });
    } catch (error) {
      handleGrpcError(callback, error);
    }
  },

  async ListMessages(call, callback) {
    try {
      const messages = await getMessages({
        currentStudentId: call.request.currentStudentId,
        conversationId: call.request.conversationId,
        limit: call.request.limit || 50,
        before: call.request.before || null,
      });
      callback(null, {
        messages: messages.map(mapMessage),
      });
    } catch (error) {
      handleGrpcError(callback, error);
    }
  },

  async SendMessage(call, callback) {
    try {
      const message = await sendMessage({
        currentStudentId: call.request.currentStudentId,
        conversationId: call.request.conversationId,
        content: call.request.content,
        correlationId: call.request.correlationId || null,
      });
      callback(null, {
        message: mapMessage(message),
      });
    } catch (error) {
      handleGrpcError(callback, error);
    }
  },

  async IsConversationMember(call, callback) {
    try {
      const result = await isConversationMember({
        conversationId: call.request.conversationId,
        studentId: call.request.studentId,
      });
      callback(null, {
        isMember: result,
      });
    } catch (error) {
      handleGrpcError(callback, error);
    }
  },
};
