import type { ChatNamespace, ChatSocket } from "../type";
import type {
  PinRequestDTO,
  UnpinRequestDTO,
  PinUnpinAck,
  PinnedMessageDTO,
  PinnedReplayDTO,
} from "../dto/chat.dto";
import { findMessage } from "../store/message.store";
import {
  getOrCreatePinned,
  getPinned,
  setPinned,
} from "../store/pin.store";
import { broadcastToConversation } from "../util/broadcast";

const PIN_SNIPPET_MAX = 200;

export function registerPinHandlers(nsp: ChatNamespace, socket: ChatSocket) {
  const user = socket.data.user;

  socket.on(
    "chat:pin",
    async (data: PinRequestDTO, ack: (res: PinUnpinAck) => void) => {
      const msg = await findMessage(data.conversationId, data.messageId);
      if (msg?.deleted || msg?.type === "system") {
        return ack({ ok: false, error: "not_found" });
      }

      // Prefer authoritative server message, fall back to client snippet
      // (handles server restart wiping in-memory messageStore).
      const resolvedType: PinnedMessageDTO["type"] | undefined =
        msg ? (msg.type as PinnedMessageDTO["type"]) : data.type;
      const resolvedContent = msg?.content ?? data.content;
      const resolvedSenderId = msg?.senderId ?? data.senderId;
      const resolvedSenderName = msg?.senderName ?? data.senderName;

      if (
        !resolvedType ||
        resolvedContent === undefined ||
        !resolvedSenderId ||
        !resolvedSenderName
      ) {
        return ack({ ok: false, error: "not_found" });
      }

      const list = getOrCreatePinned(data.conversationId);
      if (list.some((p) => p.id === data.messageId)) {
        return ack({ ok: true });
      }

      const snippet =
        resolvedType === "text" && resolvedContent.length > PIN_SNIPPET_MAX
          ? resolvedContent.slice(0, PIN_SNIPPET_MAX) + "…"
          : resolvedContent;

      const pin: PinnedMessageDTO = {
        id: data.messageId,
        conversationId: data.conversationId,
        content: snippet,
        type: resolvedType,
        senderId: resolvedSenderId,
        senderName: resolvedSenderName,
        pinnedAt: Date.now(),
        pinnedBy: user.id,
        pinnedByName: user.name,
      };
      list.unshift(pin);
      broadcastToConversation(nsp, data.conversationId, (t) =>
        t.emit("chat:pinned", pin),
      );
      ack({ ok: true });
    },
  );

  socket.on(
    "chat:unpin",
    (data: UnpinRequestDTO, ack: (res: PinUnpinAck) => void) => {
      const list = getPinned(data.conversationId);
      if (!list) return ack({ ok: true });
      setPinned(
        data.conversationId,
        list.filter((p) => p.id !== data.messageId),
      );
      broadcastToConversation(nsp, data.conversationId, (t) =>
        t.emit("chat:unpinned", {
          conversationId: data.conversationId,
          messageId: data.messageId,
        }),
      );
      ack({ ok: true });
    },
  );

  socket.on(
    "chat:pins-fetch",
    (
      data: { conversationId: string },
      ack: (res: PinnedReplayDTO) => void,
    ) => {
      ack({
        conversationId: data.conversationId,
        pinned: getPinned(data.conversationId) ?? [],
      });
    },
  );
}
