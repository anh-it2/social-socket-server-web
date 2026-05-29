import type { ChatNamespace, ChatSocket } from "../type";
import type {
  ReactMessageDTO,
  ReactionAck,
  ReactionKey,
} from "../dto/chat.dto";
import { REACTION_KEYS } from "../dto/chat.dto";
import { applyReaction, findMessage } from "../store/message.store";
import { broadcastToConversation } from "../util/broadcast";

function isReactionKey(v: unknown): v is ReactionKey {
  return typeof v === "string" && REACTION_KEYS.includes(v as ReactionKey);
}

export function registerReactionHandlers(
  nsp: ChatNamespace,
  socket: ChatSocket,
) {
  const user = socket.data.user;

  socket.on(
    "chat:react",
    async (data: ReactMessageDTO, ack: (res: ReactionAck) => void) => {
      if (data.emoji !== null && !isReactionKey(data.emoji)) {
        return ack({ ok: false, error: "invalid_emoji" });
      }

      const msg = await findMessage(data.conversationId, data.messageId);
      if (!msg || msg.deleted || msg.type === "system") {
        return ack({ ok: false, error: "not_found" });
      }

      // One reaction per user, enforced by the (messageId,userId) PK:
      // emoji set = upsert (react / replace), null = remove.
      await applyReaction(
        data.messageId,
        user.id,
        user.name,
        data.emoji,
      );

      broadcastToConversation(nsp, data.conversationId, (t) =>
        t.emit("chat:reacted", {
          conversationId: data.conversationId,
          messageId: data.messageId,
          messageOwnerId: msg.senderId,
          userId: user.id,
          userName: user.name,
          emoji: data.emoji,
        }),
      );
      ack({ ok: true });
    },
  );
}
