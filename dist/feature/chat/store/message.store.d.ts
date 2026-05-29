import type { ChatMessage } from "../type";
import type { ChatHistoryResponseDTO, ReactionKey } from "../dto/chat.dto";
export declare function findMessage(conversationId: string, messageId: string): Promise<ChatMessage | undefined>;
export declare function getHistory(conversationId: string, cursor?: number, limit?: number): Promise<ChatHistoryResponseDTO>;
/**
 * Replaces the old `eachConversation()` scan for offline DM replay
 * (chat.handler.flushPendingMessages): undeleted DM messages in
 * conversations the user is part of, newer than `since`, not sent by them.
 */
export declare function getDirectMessagesSince(userId: string, since: number): Promise<ChatMessage[]>;
export declare function addMessage(conversationId: string, message: ChatMessage): Promise<void>;
/** Edit body + stamp editedAt. No-op if the row is gone (matches old guard). */
export declare function editMessage(conversationId: string, messageId: string, content: string, editedAt: number): Promise<void>;
/** Soft-delete: blank content, keep the row so replies/pins still resolve. */
export declare function unsendMessage(conversationId: string, messageId: string): Promise<void>;
export declare function deleteConversationMessages(conversationId: string): Promise<void>;
/**
 * Apply one user's reaction to a message. PK (messageId,userId) enforces
 * one emoji per user per message:
 *  - emoji === null  → remove the user's reaction (delete the row)
 *  - emoji set       → upsert (react, or replace the user's previous emoji)
 *
 * One independent row write — no read-modify-write, so concurrent reactors
 * on the same message don't clobber each other. Cascades away with the
 * message (group dissolve / hard delete); survives soft-delete (row kept).
 */
export declare function applyReaction(messageId: string, userId: string, userName: string, emoji: ReactionKey | null): Promise<void>;
