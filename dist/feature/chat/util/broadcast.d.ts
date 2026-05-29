import type { ChatNamespace } from "../type";
export declare function dmParticipants(conversationId: string, selfId: string): {
    recipientId: string | null;
};
export declare function dmInvolves(conversationId: string, userId: string): boolean;
export declare function broadcast(nsp: ChatNamespace, conversationId: string, selfId: string, emit: (target: ReturnType<ChatNamespace["to"]>) => void): void;
export declare function broadcastToConversation(nsp: ChatNamespace, conversationId: string, emit: (target: ReturnType<ChatNamespace["to"]>) => void): void;
