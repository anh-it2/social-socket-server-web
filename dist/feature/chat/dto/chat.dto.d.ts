/**
 * DTOs — exact shape of data on the wire (what server sends/receives).
 * When backend changes a field, update ONLY this file and the mappers —
 * components never know.
 */
export interface ReplyContextDTO {
    id: string;
    senderId: string;
    senderName: string;
    content: string;
    type: "text" | "image" | "file" | "video";
}
export type ReactionKey = "like" | "love" | "haha" | "wow" | "sad" | "angry";
export declare const REACTION_KEYS: ReactionKey[];
export interface MessageReactionDTO {
    userId: string;
    userName: string;
    emoji: ReactionKey;
}
export interface ChatMessageDTO {
    id: string;
    conversationId: string;
    senderId: string;
    senderName: string;
    content: string;
    timestamp: number;
    type: "text" | "image" | "file" | "video" | "system";
    replyTo?: ReplyContextDTO;
    editedAt?: number;
    deleted?: boolean;
    reactions?: MessageReactionDTO[];
    error?: string;
}
export interface MessageEditedDTO {
    conversationId: string;
    messageId: string;
    content: string;
    editedAt: number;
}
export interface MessageUnsentDTO {
    conversationId: string;
    messageId: string;
}
export interface TypingEventDTO {
    conversationId: string;
    userId: string;
    userName: string;
    isTyping: boolean;
}
export interface ReadReceiptDTO {
    conversationId: string;
    userId: string;
    messageId: string;
}
export interface SendMessageDTO {
    conversationId: string;
    content: string;
    type?: ChatMessageDTO["type"];
    replyTo?: ReplyContextDTO;
}
export interface EditMessageDTO {
    conversationId: string;
    messageId: string;
    content: string;
}
export interface UnsendMessageDTO {
    conversationId: string;
    messageId: string;
}
export interface SendTypingDTO {
    conversationId: string;
    isTyping: boolean;
}
export interface SendReadDTO {
    conversationId: string;
    messageId: string;
}
export interface ChatHistoryRequestDTO {
    conversationId: string;
    cursor?: number;
    limit?: number;
}
export interface ChatHistoryResponseDTO {
    messages: ChatMessageDTO[];
    nextCursor: number | null;
    hasMore: boolean;
}
export interface CreateGroupDTO {
    tempId: string;
    name: string;
    memberIds: string[];
}
export interface CreateGroupAck {
    ok: boolean;
    conversationId?: string;
    error?: string;
}
export interface GroupCreatedDTO {
    conversationId: string;
    name: string;
    memberIds: string[];
    adminIds: string[];
    mutedMembers: string[];
    blockedMembers: string[];
    createdAt: number;
    createdBy: string;
}
export interface GroupUpdatedDTO extends GroupCreatedDTO {
}
export type GroupDeletedReason = "left" | "kicked" | "deleted" | "dissolved";
export interface GroupDeletedDTO {
    conversationId: string;
    reason?: GroupDeletedReason;
}
export interface GroupActionAck {
    ok: boolean;
    error?: string;
}
export interface GroupLeaveDTO {
    conversationId: string;
}
export interface GroupKickDTO {
    conversationId: string;
    targetUserId: string;
    targetName?: string;
}
export interface GroupPromoteDTO {
    conversationId: string;
    targetUserId: string;
}
export interface GroupToggleMemberDTO {
    conversationId: string;
    targetUserId: string;
    on: boolean;
}
export interface GroupDeleteDTO {
    conversationId: string;
}
export interface PinnedMessageDTO {
    id: string;
    conversationId: string;
    content: string;
    type: "text" | "image" | "file" | "video";
    senderId: string;
    senderName: string;
    pinnedAt: number;
    pinnedBy: string;
    pinnedByName: string;
}
export interface PinRequestDTO {
    conversationId: string;
    messageId: string;
    content?: string;
    type?: "text" | "image" | "file" | "video";
    senderId?: string;
    senderName?: string;
}
export interface UnpinRequestDTO {
    conversationId: string;
    messageId: string;
}
export interface PinUnpinAck {
    ok: boolean;
    error?: string;
}
export interface PinnedReplayDTO {
    conversationId: string;
    pinned: PinnedMessageDTO[];
}
export interface MessageUnpinnedBroadcastDTO {
    conversationId: string;
    messageId: string;
}
export interface ReactMessageDTO {
    conversationId: string;
    messageId: string;
    emoji: ReactionKey | null;
}
export interface ReactionAck {
    ok: boolean;
    error?: string;
}
export interface ReactionBroadcastDTO {
    conversationId: string;
    messageId: string;
    messageOwnerId: string;
    userId: string;
    userName: string;
    emoji: ReactionKey | null;
}
export interface ChatClientToServerEvents {
    "chat:join": (conversationId: string) => void;
    "chat:leave": (conversationId: string) => void;
    "chat:message": (data: SendMessageDTO, ack: (msg: ChatMessageDTO) => void) => void;
    "chat:history": (data: ChatHistoryRequestDTO, ack: (res: ChatHistoryResponseDTO) => void) => void;
    "chat:typing": (data: SendTypingDTO) => void;
    "chat:read": (data: SendReadDTO) => void;
    "chat:edit": (data: EditMessageDTO, ack: (res: {
        ok: boolean;
        error?: string;
    }) => void) => void;
    "chat:unsend": (data: UnsendMessageDTO, ack: (res: {
        ok: boolean;
        error?: string;
    }) => void) => void;
    "group:create": (data: CreateGroupDTO, ack: (res: CreateGroupAck) => void) => void;
    "group:leave": (data: GroupLeaveDTO, ack: (res: GroupActionAck) => void) => void;
    "group:kick": (data: GroupKickDTO, ack: (res: GroupActionAck) => void) => void;
    "group:promote": (data: GroupPromoteDTO, ack: (res: GroupActionAck) => void) => void;
    "group:mute-member": (data: GroupToggleMemberDTO, ack: (res: GroupActionAck) => void) => void;
    "group:block-member": (data: GroupToggleMemberDTO, ack: (res: GroupActionAck) => void) => void;
    "group:delete": (data: GroupDeleteDTO, ack: (res: GroupActionAck) => void) => void;
    "chat:pin": (data: PinRequestDTO, ack: (res: PinUnpinAck) => void) => void;
    "chat:unpin": (data: UnpinRequestDTO, ack: (res: PinUnpinAck) => void) => void;
    "chat:pins-fetch": (data: {
        conversationId: string;
    }, ack: (res: PinnedReplayDTO) => void) => void;
    "chat:react": (data: ReactMessageDTO, ack: (res: ReactionAck) => void) => void;
}
export interface ChatServerToClientEvents {
    "chat:message": (message: ChatMessageDTO) => void;
    "chat:typing": (data: TypingEventDTO) => void;
    "chat:read": (data: ReadReceiptDTO) => void;
    "chat:edited": (data: MessageEditedDTO) => void;
    "chat:unsent": (data: MessageUnsentDTO) => void;
    "group:created": (data: GroupCreatedDTO) => void;
    "group:updated": (data: GroupUpdatedDTO) => void;
    "group:deleted": (data: GroupDeletedDTO) => void;
    "chat:pinned": (data: PinnedMessageDTO) => void;
    "chat:unpinned": (data: MessageUnpinnedBroadcastDTO) => void;
    "chat:pins-replay": (data: PinnedReplayDTO) => void;
    "chat:reacted": (data: ReactionBroadcastDTO) => void;
}
