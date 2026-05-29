import type { NotificationKind } from "./dto/notification.dto";
import type { NotificationNamespace, NotificationSocket } from "./type";
import {
  listNotifications,
  createNotification,
  markRead,
  markAllRead,
} from "./store/notification.store";

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
let firstUserId: string | null = null;

export function registerNotificationHandler(
  nsp: NotificationNamespace,
  socket: NotificationSocket,
) {
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
    ack({ notifications: await listNotifications(user.id) });
  });

  socket.on("notification:emit", async (data, ack) => {
    if (!data.recipientId) {
      return ack({ ok: false, error: "missing_recipient" });
    }
    if (data.recipientId === user.id) {
      return ack({ ok: true });
    }

    const dto = await createNotification({
      recipientId: data.recipientId,
      actorId: user.id,
      actorName: user.name,
      kind: data.kind as NotificationKind,
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
    const changed = await markRead(user.id, data.notificationId);
    if (changed) {
      nsp.to(`user:${user.id}`).emit("notification:read-update", data.notificationId);
    }
    ack({ ok: true });
  });

  socket.on("notification:read-all", async (ack) => {
    await markAllRead(user.id);
    nsp.to(`user:${user.id}`).emit("notification:read-all-update");
    ack({ ok: true });
  });
}
