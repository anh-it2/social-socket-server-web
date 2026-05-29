import type { Message as Row, MessageType } from "@prisma/client";
import { prisma } from "../../../config/prisma";
import type { ChatMessage, ReplyContext } from "../type";
import type {
  ChatHistoryResponseDTO,
  MessageReactionDTO,
  ReactionKey,
} from "../dto/chat.dto";

const PAGE_SIZE = 30;
const REPLY_SNIPPET_MAX = 140;

// ─── mapping: DB row ⇄ wire ChatMessage ──────────────────────────────

// Wire senderId is a non-null string; system/group-event messages use the
// sentinel "system" (no User row → DB senderId is null).
const SYSTEM = "system";

function replySnippet(type: string, content: string): string {
  return type === "text" && content.length > REPLY_SNIPPET_MAX
    ? content.slice(0, REPLY_SNIPPET_MAX) + "…"
    : content;
}

function toReplyContext(parent: Row | null): ReplyContext | undefined {
  if (!parent || parent.deleted || parent.type === "system") return undefined;
  return {
    id: parent.id,
    senderId: parent.senderId ?? SYSTEM,
    senderName: parent.senderName,
    content: replySnippet(parent.type, parent.content),
    type: parent.type as ReplyContext["type"],
  };
}

function rowToMessage(
  row: Row,
  replyTo?: ReplyContext,
  reactions?: MessageReactionDTO[],
): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId ?? SYSTEM,
    senderName: row.senderName,
    content: row.content,
    timestamp: row.createdAt.getTime(),
    type: row.type as ChatMessage["type"],
    ...(replyTo ? { replyTo } : {}),
    ...(row.editedAt ? { editedAt: row.editedAt.getTime() } : {}),
    ...(row.deleted ? { deleted: true } : {}),
    ...(reactions && reactions.length ? { reactions } : {}),
  };
}

/**
 * Resolve `replyTo` parents + `reactions` for many rows in two batched
 * queries (avoids N+1 in getHistory). One query per concern, not per row.
 */
async function hydrate(rows: Row[]): Promise<ChatMessage[]> {
  if (rows.length === 0) return [];

  const parentIds = [
    ...new Set(rows.map((r) => r.replyToId).filter((v): v is string => !!v)),
  ];
  const messageIds = rows.map((r) => r.id);

  const [parents, reacts] = await Promise.all([
    parentIds.length
      ? prisma.message.findMany({ where: { id: { in: parentIds } } })
      : Promise.resolve([] as Row[]),
    prisma.messageReaction.findMany({ where: { messageId: { in: messageIds } } }),
  ]);

  const parentById = new Map(parents.map((p) => [p.id, p]));
  const reactionsByMessage = new Map<string, MessageReactionDTO[]>();
  for (const r of reacts) {
    const list = reactionsByMessage.get(r.messageId) ?? [];
    list.push({
      userId: r.userId,
      userName: r.userName,
      emoji: r.emoji as ReactionKey,
    });
    reactionsByMessage.set(r.messageId, list);
  }

  return rows.map((r) =>
    rowToMessage(
      r,
      r.replyToId
        ? toReplyContext(parentById.get(r.replyToId) ?? null)
        : undefined,
      reactionsByMessage.get(r.id),
    ),
  );
}

// ─── reads ───────────────────────────────────────────────────────────

export async function findMessage(
  conversationId: string,
  messageId: string,
): Promise<ChatMessage | undefined> {
  const row = await prisma.message.findFirst({
    where: { id: messageId, conversationId },
  });
  if (!row) return undefined;
  return (await hydrate([row]))[0];
}

export async function getHistory(
  conversationId: string,
  cursor?: number,
  limit: number = PAGE_SIZE,
): Promise<ChatHistoryResponseDTO> {
  // Page backward from the cursor: newest-first slice, then reverse so the
  // returned page is oldest→newest (matches the old array-order contract).
  const rows = await prisma.message.findMany({
    where: {
      conversationId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const page = (hasMore ? rows.slice(0, limit) : rows).reverse();
  const messages = await hydrate(page);

  return {
    messages,
    nextCursor: hasMore && page.length ? page[0].createdAt.getTime() : null,
    hasMore,
  };
}

/**
 * Replaces the old `eachConversation()` scan for offline DM replay
 * (chat.handler.flushPendingMessages): undeleted DM messages in
 * conversations the user is part of, newer than `since`, not sent by them.
 */
export async function getDirectMessagesSince(
  userId: string,
  since: number,
): Promise<ChatMessage[]> {
  const rows = await prisma.message.findMany({
    where: {
      conversationId: { startsWith: "dm:" },
      deleted: false,
      createdAt: { gt: new Date(since) },
      NOT: { senderId: userId },
    },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
  });
  // "dm:<a>:<b>" with sorted ids — keep only conversations involving userId.
  const mine = rows.filter((r) => {
    const [, a, b] = r.conversationId.split(":");
    return a === userId || b === userId;
  });
  return hydrate(mine);
}

// ─── writes ──────────────────────────────────────────────────────────

export async function addMessage(
  conversationId: string,
  message: ChatMessage,
): Promise<void> {
  // Only link replyToId when the parent actually exists in the DB — the
  // client may reply to a message that was never persisted (older than the
  // DB, or a restart gap), and a dangling FK would reject the insert. The
  // resolved snippet still rides on message.replyTo for the live emit/ack.
  let replyToId: string | null = null;
  if (message.replyTo?.id) {
    const parent = await prisma.message.findUnique({
      where: { id: message.replyTo.id },
      select: { id: true },
    });
    replyToId = parent?.id ?? null;
  }

  await prisma.message.create({
    data: {
      id: message.id,
      conversationId,
      senderId: message.senderId === SYSTEM ? null : message.senderId,
      senderName: message.senderName,
      content: message.content,
      type: message.type as MessageType,
      replyToId,
      editedAt: message.editedAt ? new Date(message.editedAt) : null,
      deleted: message.deleted ?? false,
      createdAt: new Date(message.timestamp),
    },
  });
}

/** Edit body + stamp editedAt. No-op if the row is gone (matches old guard). */
export async function editMessage(
  conversationId: string,
  messageId: string,
  content: string,
  editedAt: number,
): Promise<void> {
  await prisma.message.updateMany({
    where: { id: messageId, conversationId },
    data: { content, editedAt: new Date(editedAt) },
  });
}

/** Soft-delete: blank content, keep the row so replies/pins still resolve. */
export async function unsendMessage(
  conversationId: string,
  messageId: string,
): Promise<void> {
  await prisma.message.updateMany({
    where: { id: messageId, conversationId },
    data: { deleted: true, content: "" },
  });
}

export async function deleteConversationMessages(
  conversationId: string,
): Promise<void> {
  // Replies inside the same conversation cascade to null via the FK.
  await prisma.message.deleteMany({ where: { conversationId } });
}

// ─── reactions (DB, bound to the message) ────────────────────────────

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
export async function applyReaction(
  messageId: string,
  userId: string,
  userName: string,
  emoji: ReactionKey | null,
): Promise<void> {
  if (emoji === null) {
    await prisma.messageReaction.deleteMany({ where: { messageId, userId } });
    return;
  }
  await prisma.messageReaction.upsert({
    where: { messageId_userId: { messageId, userId } },
    create: { messageId, userId, userName, emoji },
    update: { userName, emoji },
  });
}
