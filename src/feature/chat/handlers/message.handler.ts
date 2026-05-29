import { randomUUID } from "node:crypto";
import type { ChatNamespace, ChatSocket, ChatMessage } from "../type";
import type { ChatHistoryRequestDTO } from "../dto/chat.dto";
import {
  addMessage,
  editMessage,
  findMessage,
  getHistory,
  unsendMessage,
} from "../store/message.store";
import { getGroup } from "../store/group.store";
import { broadcast } from "../util/broadcast";
import { buildReplyContext } from "../util/reply";

export function registerMessageHandlers(
  nsp: ChatNamespace,
  socket: ChatSocket,
) {
  const user = socket.data.user;

  socket.on("chat:history", async (data: ChatHistoryRequestDTO, ack) => {
    ack(await getHistory(data.conversationId, data.cursor, data.limit));
  });

  socket.on("chat:message", async (data, ack) => {
    if (data.conversationId.startsWith("group:")) {
      const group = getGroup(data.conversationId);
      const baseError = {
        id: "",
        conversationId: data.conversationId,
        senderId: user.id,
        senderName: user.name,
        content: data.content,
        type: data.type ?? "text",
        timestamp: Date.now(),
      } as const;
      if (!group || !group.memberIds.includes(user.id)) {
        return ack({ ...baseError, error: "not_member" });
      }
      if (group.mutedMembers.includes(user.id)) {
        return ack({ ...baseError, error: "muted" });
      }
    }

    const replyTo = await buildReplyContext(data.conversationId, data.replyTo);

    const message: ChatMessage = {
      id: randomUUID(),
      conversationId: data.conversationId,
      senderId: user.id,
      senderName: user.name,
      content: data.content,
      type: data.type ?? "text",
      timestamp: Date.now(),
      ...(replyTo ? { replyTo } : {}),
    };

    await addMessage(data.conversationId, message);

    broadcast(nsp, data.conversationId, user.id, (target) =>
      target.emit("chat:message", message),
    );

    ack(message);
  });

  socket.on("chat:edit", async (data, ack) => {
    const target = await findMessage(data.conversationId, data.messageId);
    const editedAt = Date.now();

    if (target) {
      if (target.senderId !== user.id) {
        return ack({ ok: false, error: "forbidden" });
      }
      if (target.deleted) return ack({ ok: false, error: "deleted" });
      if (target.type !== "text") {
        return ack({ ok: false, error: "non_editable" });
      }
      await editMessage(
        data.conversationId,
        data.messageId,
        data.content,
        editedAt,
      );
    }

    broadcast(nsp, data.conversationId, user.id, (t) =>
      t.emit("chat:edited", {
        conversationId: data.conversationId,
        messageId: data.messageId,
        content: data.content,
        editedAt,
      }),
    );

    ack({ ok: true });
  });

  socket.on("chat:unsend", async (data, ack) => {
    const target = await findMessage(data.conversationId, data.messageId);
    if (target) {
      if (target.senderId !== user.id) {
        return ack({ ok: false, error: "forbidden" });
      }
      await unsendMessage(data.conversationId, data.messageId);
    }

    broadcast(nsp, data.conversationId, user.id, (t) =>
      t.emit("chat:unsent", {
        conversationId: data.conversationId,
        messageId: data.messageId,
      }),
    );

    ack({ ok: true });
  });
}
