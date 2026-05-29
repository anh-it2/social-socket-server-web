"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listNotifications = listNotifications;
exports.createNotification = createNotification;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
const client_1 = require("@prisma/client");
const prisma_1 = require("../../../config/prisma");
// Newest-N replay cap. Was MAX_PER_USER in the old in-memory store; now it
// bounds both the "notification:list" page AND the persisted rows (older
// rows pruned on insert) so the table can't grow without limit per user.
const MAX_PER_USER = 50;
// ─── mapping: DB row → wire DTO ──────────────────────────────────────
// DB postId/preview are nullable; the wire DTO uses optional string. Omit
// the key when null so the emitted shape matches the old in-memory object
// (mapper/FE treat missing === absent).
function rowToDTO(row) {
    return Object.assign(Object.assign(Object.assign({ id: row.id, recipientId: row.recipientId, actorId: row.actorId, actorName: row.actorName, kind: row.kind }, (row.postId ? { postId: row.postId } : {})), (row.preview ? { preview: row.preview } : {})), { read: row.read, timestamp: row.createdAt.getTime() });
}
// ─── reads ───────────────────────────────────────────────────────────
/** Newest MAX_PER_USER for a recipient, newest-first (old store order). */
async function listNotifications(userId) {
    const rows = await prisma_1.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: MAX_PER_USER,
    });
    return rows.map(rowToDTO);
}
/**
 * Persist one notification and return its wire DTO (so the handler emits
 * exactly what was stored). Returns null on a foreign-key violation —
 * recipientId is client-supplied and may not be a real User row; a bad id
 * must not crash the socket handler.
 */
async function createNotification(input) {
    var _a, _b;
    let row;
    try {
        row = await prisma_1.prisma.notification.create({
            data: {
                recipientId: input.recipientId,
                actorId: input.actorId,
                actorName: input.actorName,
                kind: input.kind,
                postId: (_a = input.postId) !== null && _a !== void 0 ? _a : null,
                preview: (_b = input.preview) !== null && _b !== void 0 ? _b : null,
            },
        });
    }
    catch (e) {
        // P2003 = FK constraint failed (recipient/actor not a real User).
        if (e instanceof client_1.Prisma.PrismaClientKnownRequestError && e.code === "P2003") {
            return null;
        }
        throw e;
    }
    // Bound the per-recipient row count (old MAX_PER_USER behaviour). Best
    // effort: a prune failure must not fail the notification itself.
    pruneOldest(input.recipientId).catch(() => { });
    return rowToDTO(row);
}
/** Delete everything older than the newest MAX_PER_USER for a recipient. */
async function pruneOldest(userId) {
    const cutoff = await prisma_1.prisma.notification.findMany({
        where: { recipientId: userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip: MAX_PER_USER,
        take: 1,
        select: { createdAt: true },
    });
    if (cutoff.length === 0)
        return;
    await prisma_1.prisma.notification.deleteMany({
        where: { recipientId: userId, createdAt: { lte: cutoff[0].createdAt } },
    });
}
/**
 * Mark one notification read. True only when it exists, belongs to the
 * user, and flipped unread→read (drives the read-update broadcast — old
 * `markRead` returned false for an already-read or missing row).
 */
async function markRead(userId, notificationId) {
    const res = await prisma_1.prisma.notification.updateMany({
        where: { id: notificationId, recipientId: userId, read: false },
        data: { read: true },
    });
    return res.count > 0;
}
/** Mark every unread notification for the user read. */
async function markAllRead(userId) {
    await prisma_1.prisma.notification.updateMany({
        where: { recipientId: userId, read: false },
        data: { read: true },
    });
}
