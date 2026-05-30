"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReportHandler = registerReportHandler;
const notification_store_1 = require("../notification/store/notification.store");
/**
 * Relay-only report channel. The BE (social-platform-be) persists reports and
 * is the source of truth; this server just fans the events out in realtime:
 *  - admins (role === "ADMIN") join the "admins" room and receive
 *    `report:new` (a freshly persisted report) and `report:status-update`.
 *  - all connected clients receive `report:post-removed` when a report is
 *    approved, so each browser can purge its local copy of the post.
 *
 * It also pushes durable-ish (in-memory) notifications via the notification
 * namespace so they surface in the bell/dropdown anywhere in the app:
 *  - every admin gets a `report_submitted` notification on a new report;
 *  - the reporter gets a `report_approved` / `report_rejected` notification
 *    when an admin resolves it.
 *
 * No in-memory queue: admins load the existing list from the BE REST API.
 */
const ADMINS_ROOM = "admins";
function isAdmin(socket) {
    var _a;
    return ((_a = socket.data.user) === null || _a === void 0 ? void 0 : _a.role) === "ADMIN";
}
function registerReportHandler(nsp, notificationNsp, socket) {
    const user = socket.data.user;
    const admin = isAdmin(socket);
    if (admin) {
        socket.join(ADMINS_ROOM);
        console.log(`[report] admin joined: ${user.name} (${user.id})`);
    }
    // Push a notification into a user's `user:<id>` room on the notification
    // namespace (same path the notification handler uses), so the bell updates.
    async function notifyUser(recipientId, actorId, actorName, kind, postId, preview) {
        if (recipientId === actorId)
            return;
        const dto = await (0, notification_store_1.createNotification)({
            recipientId,
            actorId,
            actorName,
            kind,
            postId,
            preview,
        });
        if (dto)
            notificationNsp.to(`user:${recipientId}`).emit("notification:new", dto);
    }
    // A user submitted a report (already persisted by the BE) → push to admins.
    socket.on("report:emit", async (report, ack) => {
        if (!(report === null || report === void 0 ? void 0 : report.id) || !(report === null || report === void 0 ? void 0 : report.postId)) {
            return ack({ ok: false, error: "invalid_payload" });
        }
        nsp.to(ADMINS_ROOM).emit("report:new", report);
        // Notify every admin (so they see it in the bell even off the /admin page).
        try {
            const adminIds = await (0, notification_store_1.listAdminIds)();
            await Promise.all(adminIds.map((adminId) => notifyUser(adminId, report.reporterId, report.reporterName, "report_submitted", report.postId, report.reason)));
        }
        catch (e) {
            console.error("[report] admin notify failed:", e);
        }
        ack({ ok: true });
    });
    // Admin approved a report (BE already deleted the post) → notify everyone.
    socket.on("report:approve", async (data, ack) => {
        if (!admin)
            return ack({ ok: false, error: "forbidden" });
        if (!(data === null || data === void 0 ? void 0 : data.reportId) || !(data === null || data === void 0 ? void 0 : data.postId)) {
            return ack({ ok: false, error: "invalid_payload" });
        }
        nsp.to(ADMINS_ROOM).emit("report:status-update", {
            reportId: data.reportId,
            status: "approved",
            postId: data.postId,
        });
        nsp.emit("report:post-removed", {
            postId: data.postId,
            postOwnerId: data.postOwnerId,
        });
        if (data.reporterId) {
            await notifyUser(data.reporterId, user.id, user.name, "report_approved", data.postId).catch((e) => console.error("[report] reporter notify failed:", e));
        }
        ack({ ok: true });
    });
    // Admin rejected a report (BE marked it rejected) → notify other admins.
    socket.on("report:reject", async (data, ack) => {
        if (!admin)
            return ack({ ok: false, error: "forbidden" });
        if (!(data === null || data === void 0 ? void 0 : data.reportId) || !(data === null || data === void 0 ? void 0 : data.postId)) {
            return ack({ ok: false, error: "invalid_payload" });
        }
        nsp.to(ADMINS_ROOM).emit("report:status-update", {
            reportId: data.reportId,
            status: "rejected",
            postId: data.postId,
        });
        if (data.reporterId) {
            await notifyUser(data.reporterId, user.id, user.name, "report_rejected", data.postId).catch((e) => console.error("[report] reporter notify failed:", e));
        }
        ack({ ok: true });
    });
}
