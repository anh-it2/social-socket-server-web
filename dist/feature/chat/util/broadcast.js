"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dmParticipants = dmParticipants;
exports.dmInvolves = dmInvolves;
exports.broadcast = broadcast;
exports.broadcastToConversation = broadcastToConversation;
function dmParticipants(conversationId, selfId) {
    if (!conversationId.startsWith("dm:"))
        return { recipientId: null };
    const [a, b] = conversationId.slice(3).split(":");
    if (!a || !b)
        return { recipientId: null };
    return { recipientId: a === selfId ? b : a };
}
function dmInvolves(conversationId, userId) {
    if (!conversationId.startsWith("dm:"))
        return false;
    const [a, b] = conversationId.slice(3).split(":");
    return a === userId || b === userId;
}
function broadcast(nsp, conversationId, selfId, emit) {
    const { recipientId } = dmParticipants(conversationId, selfId);
    if (recipientId) {
        emit(nsp.to(`user:${recipientId}`).to(`user:${selfId}`));
    }
    else {
        emit(nsp.to(`chat:${conversationId}`));
    }
}
function broadcastToConversation(nsp, conversationId, emit) {
    if (conversationId.startsWith("dm:")) {
        const [a, b] = conversationId.slice(3).split(":");
        if (!a || !b)
            return;
        emit(nsp.to(`user:${a}`).to(`user:${b}`));
    }
    else {
        emit(nsp.to(`chat:${conversationId}`));
    }
}
