"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReportHandler = registerReportHandler;
/**
 * Relay-only report channel. The BE (social-platform-be) persists reports and
 * is the source of truth; this server just fans the events out in realtime:
 *  - admins (role === "ADMIN") join the "admins" room and receive
 *    `report:new` (a freshly persisted report) and `report:status-update`.
 *  - all connected clients receive `report:post-removed` when a report is
 *    approved, so each browser can purge its local copy of the post.
 *
 * No in-memory queue: admins load the existing list from the BE REST API.
 */
const ADMINS_ROOM = "admins";
function isAdmin(socket) {
    var _a;
    return ((_a = socket.data.user) === null || _a === void 0 ? void 0 : _a.role) === "ADMIN";
}
function registerReportHandler(nsp, socket) {
    const user = socket.data.user;
    const admin = isAdmin(socket);
    if (admin) {
        socket.join(ADMINS_ROOM);
        console.log(`[report] admin joined: ${user.name} (${user.id})`);
    }
    // A user submitted a report (already persisted by the BE) → push to admins.
    socket.on("report:emit", (report, ack) => {
        if (!(report === null || report === void 0 ? void 0 : report.id) || !(report === null || report === void 0 ? void 0 : report.postId)) {
            return ack({ ok: false, error: "invalid_payload" });
        }
        nsp.to(ADMINS_ROOM).emit("report:new", report);
        ack({ ok: true });
    });
    // Admin approved a report (BE already deleted the post) → notify everyone.
    socket.on("report:approve", (data, ack) => {
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
        ack({ ok: true });
    });
    // Admin rejected a report (BE marked it rejected) → notify other admins.
    socket.on("report:reject", (data, ack) => {
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
        ack({ ok: true });
    });
}
