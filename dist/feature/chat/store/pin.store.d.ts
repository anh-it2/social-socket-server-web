import type { PinnedMessageDTO } from "../dto/chat.dto";
export declare function getOrCreatePinned(conversationId: string): PinnedMessageDTO[];
export declare function getPinned(conversationId: string): PinnedMessageDTO[] | undefined;
export declare function setPinned(conversationId: string, list: PinnedMessageDTO[]): void;
