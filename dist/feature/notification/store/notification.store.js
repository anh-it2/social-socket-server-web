"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listAdminIds = listAdminIds;
exports.listNotifications = listNotifications;
exports.createNotification = createNotification;
exports.markRead = markRead;
exports.markAllRead = markAllRead;
const crypto_1 = require("crypto");
const prisma_1 = require("../../../config/prisma");
/**
 * User ids with role ADMIN — recipients for "new report" notifications.
 * Raw SQL because this server's Prisma schema is a minimal mirror that only
 * declares Message/MessageReaction (no User model), but the same DB has the
 * `users` table owned by social-network-system.
 */
async function listAdminIds() {
    const rows = await prisma_1.prisma.$queryRaw `
    SELECT id FROM users WHERE role = 'ADMIN' AND deleted_at IS NULL
  `;
    return rows.map((r) => r.id.toString());
}
// In-memory store. The NestJS BE's `notifications` table has an incompatible
// shape (BigInt ids, NotificationType enum that doesn't carry the kinds this
// server emits — friend_request, share, mention, …), and this server doesn't
// own that table. Until a compatible socket-notifications table exists in
// the BE, notifications stay in process memory and reset on restart.
const MAX_PER_USER = 50;
const byRecipient = new Map();
function rowToDTO(row) {
    return Object.assign(Object.assign(Object.assign({ id: row.id, recipientId: row.recipientId, actorId: row.actorId, actorName: row.actorName, kind: row.kind }, (row.postId ? { postId: row.postId } : {})), (row.preview ? { preview: row.preview } : {})), { read: row.read, timestamp: row.createdAt });
}
async function listNotifications(userId) {
    var _a;
    const rows = (_a = byRecipient.get(userId)) !== null && _a !== void 0 ? _a : [];
    // Newest-first.
    return rows.slice(0, MAX_PER_USER).map(rowToDTO);
}
async function createNotification(input) {
    var _a;
    const row = {
        id: (0, crypto_1.randomUUID)(),
        recipientId: input.recipientId,
        actorId: input.actorId,
        actorName: input.actorName,
        kind: input.kind,
        postId: input.postId,
        preview: input.preview,
        read: false,
        createdAt: Date.now(),
    };
    const list = (_a = byRecipient.get(input.recipientId)) !== null && _a !== void 0 ? _a : [];
    // Prepend (newest-first ordering, same as old DB query did).
    list.unshift(row);
    if (list.length > MAX_PER_USER)
        list.length = MAX_PER_USER;
    byRecipient.set(input.recipientId, list);
    return rowToDTO(row);
}
async function markRead(userId, notificationId) {
    const list = byRecipient.get(userId);
    if (!list)
        return false;
    const row = list.find((r) => r.id === notificationId);
    if (!row || row.read)
        return false;
    row.read = true;
    return true;
}
async function markAllRead(userId) {
    const list = byRecipient.get(userId);
    if (!list)
        return;
    for (const row of list)
        row.read = true;
}
