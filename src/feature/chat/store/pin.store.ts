import type { PinnedMessageDTO } from "../dto/chat.dto";

const pinnedStore = new Map<string, PinnedMessageDTO[]>();

export function getOrCreatePinned(conversationId: string): PinnedMessageDTO[] {
  let list = pinnedStore.get(conversationId);
  if (!list) {
    list = [];
    pinnedStore.set(conversationId, list);
  }
  return list;
}

export function getPinned(
  conversationId: string,
): PinnedMessageDTO[] | undefined {
  return pinnedStore.get(conversationId);
}

export function setPinned(
  conversationId: string,
  list: PinnedMessageDTO[],
): void {
  pinnedStore.set(conversationId, list);
}
