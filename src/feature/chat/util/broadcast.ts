import type { ChatNamespace } from "../type";

export function dmParticipants(
  conversationId: string,
  selfId: string,
): { recipientId: string | null } {
  if (!conversationId.startsWith("dm:")) return { recipientId: null };
  const [a, b] = conversationId.slice(3).split(":");
  if (!a || !b) return { recipientId: null };
  return { recipientId: a === selfId ? b : a };
}

export function dmInvolves(conversationId: string, userId: string): boolean {
  if (!conversationId.startsWith("dm:")) return false;
  const [a, b] = conversationId.slice(3).split(":");
  return a === userId || b === userId;
}

export function broadcast(
  nsp: ChatNamespace,
  conversationId: string,
  selfId: string,
  emit: (target: ReturnType<ChatNamespace["to"]>) => void,
) {
  const { recipientId } = dmParticipants(conversationId, selfId);
  if (recipientId) {
    emit(nsp.to(`user:${recipientId}`).to(`user:${selfId}`));
  } else {
    emit(nsp.to(`chat:${conversationId}`));
  }
}

export function broadcastToConversation(
  nsp: ChatNamespace,
  conversationId: string,
  emit: (target: ReturnType<ChatNamespace["to"]>) => void,
) {
  if (conversationId.startsWith("dm:")) {
    const [a, b] = conversationId.slice(3).split(":");
    if (!a || !b) return;
    emit(nsp.to(`user:${a}`).to(`user:${b}`));
  } else {
    emit(nsp.to(`chat:${conversationId}`));
  }
}
