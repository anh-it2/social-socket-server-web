"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findMessage = findMessage;
exports.getHistory = getHistory;
exports.getDirectMessagesSince = getDirectMessagesSince;
exports.addMessage = addMessage;
exports.editMessage = editMessage;
exports.unsendMessage = unsendMessage;
exports.deleteConversationMessages = deleteConversationMessages;
exports.applyReaction = applyReaction;
const prisma_1 = require("../../../config/prisma");
const PAGE_SIZE = 30;
const REPLY_SNIPPET_MAX = 140;
// ─── mapping: DB row ⇄ wire ChatMessage ──────────────────────────────
// Wire senderId is a non-null string; system/group-event messages use the
// sentinel "system" (no User row → DB senderId is null).
const SYSTEM = "system";
function replySnippet(type, content) {
    return type === "text" && content.length > REPLY_SNIPPET_MAX
        ? content.slice(0, REPLY_SNIPPET_MAX) + "…"
        : content;
}
function toReplyContext(parent) {
    var _a;
    if (!parent || parent.deleted || parent.type === "system")
        return undefined;
    return {
        id: parent.id,
        senderId: (_a = parent.senderId) !== null && _a !== void 0 ? _a : SYSTEM,
        senderName: parent.senderName,
        content: replySnippet(parent.type, parent.content),
        type: parent.type,
    };
}
function rowToMessage(row, replyTo, reactions) {
    var _a;
    return Object.assign(Object.assign(Object.assign(Object.assign({ id: row.id, conversationId: row.conversationId, senderId: (_a = row.senderId) !== null && _a !== void 0 ? _a : SYSTEM, senderName: row.senderName, content: row.content, timestamp: row.createdAt.getTime(), type: row.type }, (replyTo ? { replyTo } : {})), (row.editedAt ? { editedAt: row.editedAt.getTime() } : {})), (row.deleted ? { deleted: true } : {})), (reactions && reactions.length ? { reactions } : {}));
}
/**
 * Resolve `replyTo` parents + `reactions` for many rows in two batched
 * queries (avoids N+1 in getHistory). One query per concern, not per row.
 */
async function hydrate(rows) {
    var _a;
    if (rows.length === 0)
        return [];
    const parentIds = [
        ...new Set(rows.map((r) => r.replyToId).filter((v) => !!v)),
    ];
    const messageIds = rows.map((r) => r.id);
    const [parents, reacts] = await Promise.all([
        parentIds.length
            ? prisma_1.prisma.message.findMany({ where: { id: { in: parentIds } } })
            : Promise.resolve([]),
        prisma_1.prisma.messageReaction.findMany({ where: { messageId: { in: messageIds } } }),
    ]);
    const parentById = new Map(parents.map((p) => [p.id, p]));
    const reactionsByMessage = new Map();
    for (const r of reacts) {
        const list = (_a = reactionsByMessage.get(r.messageId)) !== null && _a !== void 0 ? _a : [];
        list.push({
            userId: r.userId,
            userName: r.userName,
            emoji: r.emoji,
        });
        reactionsByMessage.set(r.messageId, list);
    }
    return rows.map((r) => {
        var _a;
        return rowToMessage(r, r.replyToId
            ? toReplyContext((_a = parentById.get(r.replyToId)) !== null && _a !== void 0 ? _a : null)
            : undefined, reactionsByMessage.get(r.id));
    });
}
// ─── reads ───────────────────────────────────────────────────────────
async function findMessage(conversationId, messageId) {
    const row = await prisma_1.prisma.message.findFirst({
        where: { id: messageId, conversationId },
    });
    if (!row)
        return undefined;
    return (await hydrate([row]))[0];
}
async function getHistory(conversationId, cursor, limit = PAGE_SIZE) {
    // Page backward from the cursor: newest-first slice, then reverse so the
    // returned page is oldest→newest (matches the old array-order contract).
    const rows = await prisma_1.prisma.message.findMany({
        where: Object.assign({ conversationId }, (cursor ? { createdAt: { lt: new Date(cursor) } } : {})),
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
async function getDirectMessagesSince(userId, since) {
    const rows = await prisma_1.prisma.message.findMany({
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
async function addMessage(conversationId, message) {
    var _a, _b, _c;
    // Only link replyToId when the parent actually exists in the DB — the
    // client may reply to a message that was never persisted (older than the
    // DB, or a restart gap), and a dangling FK would reject the insert. The
    // resolved snippet still rides on message.replyTo for the live emit/ack.
    let replyToId = null;
    if ((_a = message.replyTo) === null || _a === void 0 ? void 0 : _a.id) {
        const parent = await prisma_1.prisma.message.findUnique({
            where: { id: message.replyTo.id },
            select: { id: true },
        });
        replyToId = (_b = parent === null || parent === void 0 ? void 0 : parent.id) !== null && _b !== void 0 ? _b : null;
    }
    await prisma_1.prisma.message.create({
        data: {
            id: message.id,
            conversationId,
            senderId: message.senderId === SYSTEM ? null : message.senderId,
            senderName: message.senderName,
            content: message.content,
            type: message.type,
            replyToId,
            editedAt: message.editedAt ? new Date(message.editedAt) : null,
            deleted: (_c = message.deleted) !== null && _c !== void 0 ? _c : false,
            createdAt: new Date(message.timestamp),
        },
    });
}
/** Edit body + stamp editedAt. No-op if the row is gone (matches old guard). */
async function editMessage(conversationId, messageId, content, editedAt) {
    await prisma_1.prisma.message.updateMany({
        where: { id: messageId, conversationId },
        data: { content, editedAt: new Date(editedAt) },
    });
}
/** Soft-delete: blank content, keep the row so replies/pins still resolve. */
async function unsendMessage(conversationId, messageId) {
    await prisma_1.prisma.message.updateMany({
        where: { id: messageId, conversationId },
        data: { deleted: true, content: "" },
    });
}
async function deleteConversationMessages(conversationId) {
    // Replies inside the same conversation cascade to null via the FK.
    await prisma_1.prisma.message.deleteMany({ where: { conversationId } });
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
async function applyReaction(messageId, userId, userName, emoji) {
    if (emoji === null) {
        await prisma_1.prisma.messageReaction.deleteMany({ where: { messageId, userId } });
        return;
    }
    await prisma_1.prisma.messageReaction.upsert({
        where: { messageId_userId: { messageId, userId } },
        create: { messageId, userId, userName, emoji },
        update: { userName, emoji },
    });
}
