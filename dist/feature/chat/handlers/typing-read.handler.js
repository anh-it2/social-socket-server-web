"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerTypingReadHandlers = registerTypingReadHandlers;
const broadcast_1 = require("../util/broadcast");
function registerTypingReadHandlers(_nsp, socket) {
    const user = socket.data.user;
    socket.on("chat:typing", ({ conversationId, isTyping }) => {
        const { recipientId } = (0, broadcast_1.dmParticipants)(conversationId, user.id);
        const payload = {
            conversationId,
            userId: user.id,
            userName: user.name,
            isTyping,
        };
        if (recipientId) {
            socket.to(`user:${recipientId}`).emit("chat:typing", payload);
        }
        else {
            socket.to(`chat:${conversationId}`).emit("chat:typing", payload);
        }
    });
    socket.on("chat:read", ({ conversationId, messageId }) => {
        const { recipientId } = (0, broadcast_1.dmParticipants)(conversationId, user.id);
        const payload = {
            conversationId,
            userId: user.id,
            messageId,
        };
        if (recipientId) {
            socket.to(`user:${recipientId}`).emit("chat:read", payload);
        }
        else {
            socket.to(`chat:${conversationId}`).emit("chat:read", payload);
        }
    });
}
