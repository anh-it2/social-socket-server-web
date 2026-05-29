import type { ReplyContext } from "../type";
import { findMessage } from "../store/message.store";

const SNIPPET_MAX = 140;

function snippetFor(type: ReplyContext["type"], content: string): string {
  return type === "text" && content.length > SNIPPET_MAX
    ? content.slice(0, SNIPPET_MAX) + "…"
    : content;
}

export async function buildReplyContext(
  conversationId: string,
  clientReplyTo?: ReplyContext,
): Promise<ReplyContext | undefined> {
  if (!clientReplyTo) return undefined;

  const target = await findMessage(conversationId, clientReplyTo.id);
  if (target && !target.deleted && target.type !== "system") {
    return {
      id: target.id,
      senderId: target.senderId,
      senderName: target.senderName,
      content: snippetFor(target.type, target.content),
      type: target.type,
    };
  }

  return {
    id: clientReplyTo.id,
    senderId: clientReplyTo.senderId,
    senderName: clientReplyTo.senderName,
    content: snippetFor(clientReplyTo.type, clientReplyTo.content),
    type: clientReplyTo.type,
  };
}
