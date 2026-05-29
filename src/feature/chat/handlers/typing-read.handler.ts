import type { ChatNamespace, ChatSocket } from "../type";
import { dmParticipants } from "../util/broadcast";

export function registerTypingReadHandlers(
  _nsp: ChatNamespace,
  socket: ChatSocket,
) {
  const user = socket.data.user;

  socket.on("chat:typing", ({ conversationId, isTyping }) => {
    const { recipientId } = dmParticipants(conversationId, user.id);
    const payload = {
      conversationId,
      userId: user.id,
      userName: user.name,
      isTyping,
    };
    if (recipientId) {
      socket.to(`user:${recipientId}`).emit("chat:typing", payload);
    } else {
      socket.to(`chat:${conversationId}`).emit("chat:typing", payload);
    }
  });

  socket.on("chat:read", ({ conversationId, messageId }) => {
    const { recipientId } = dmParticipants(conversationId, user.id);
    const payload = {
      conversationId,
      userId: user.id,
      messageId,
    };
    if (recipientId) {
      socket.to(`user:${recipientId}`).emit("chat:read", payload);
    } else {
      socket.to(`chat:${conversationId}`).emit("chat:read", payload);
    }
  });
}
