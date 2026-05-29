"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNotificationHandler = registerNotificationHandler;
const notification_store_1 = require("./store/notification.store");
/**
 * Notifications are DB-backed (table `Notification`, owned by
 * social-platform-be). Each user auto-joins room `user:{userId}` on connect,
 * so a push is: nsp.to("user:abc").emit("notification:new", ...).
 *
 * `firstUserId` is a separate, deliberately in-memory demo helper: the first
 * userId that ever connects becomes the global "demo owner" for mock posts so
 * cross-browser testing routes every reaction to one recipient. It is NOT
 * persistence — it resets on restart by design.
 */
let firstUserId = null;
function registerNotificationHandler(nsp, socket) {
    const user = socket.data.user;
    socket.join(`user:${user.id}`);
    if (!firstUserId) {
        firstUserId = user.id;
        console.log(`[notification] first-user captured: ${user.id} (${user.name})`);
    }
    socket.on("notification:first-user", (ack) => {
        ack({ userId: firstUserId });
    });
    socket.on("notification:list", async (ack) => {
        ack({ notifications: await (0, notification_store_1.listNotifications)(user.id) });
    });
    socket.on("notification:emit", async (data, ack) => {
        if (!data.recipientId) {
            return ack({ ok: false, error: "missing_recipient" });
        }
        if (data.recipientId === user.id) {
            return ack({ ok: true });
        }
        const dto = await (0, notification_store_1.createNotification)({
            recipientId: data.recipientId,
            actorId: user.id,
            actorName: user.name,
            kind: data.kind,
            postId: data.postId,
            preview: data.preview,
        });
        // null = FK violation: recipientId isn't a real User row.
        if (!dto) {
            return ack({ ok: false, error: "invalid_recipient" });
        }
        nsp.to(`user:${data.recipientId}`).emit("notification:new", dto);
        ack({ ok: true });
    });
    socket.on("notification:read", async (data, ack) => {
        const changed = await (0, notification_store_1.markRead)(user.id, data.notificationId);
        if (changed) {
            nsp.to(`user:${user.id}`).emit("notification:read-update", data.notificationId);
        }
        ack({ ok: true });
    });
    socket.on("notification:read-all", async (ack) => {
        await (0, notification_store_1.markAllRead)(user.id);
        nsp.to(`user:${user.id}`).emit("notification:read-all-update");
        ack({ ok: true });
    });
}
