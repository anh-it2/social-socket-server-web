"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReportHandler = registerReportHandler;
const node_crypto_1 = require("node:crypto");
/**
 * In-memory report queue. Survives until server restart.
 * Admins (userName starts with "admin") join the "admins" room so they
 * receive `report:new` and `report:status-update` pushes.
 * All connected clients receive `report:post-removed` when an admin approves,
 * so each browser can purge its local copy of the post.
 */
const reports = [];
const MAX_REPORTS = 200;
const ADMINS_ROOM = "admins";
function isAdmin(name) {
    if (!name)
        return false;
    return name.toLowerCase().startsWith("admin");
}
function toDTO(r) {
    return Object.assign({}, r);
}
function pushReport(report) {
    reports.unshift(report);
    if (reports.length > MAX_REPORTS)
        reports.length = MAX_REPORTS;
}
function setStatus(reportId, status) {
    const target = reports.find((r) => r.id === reportId);
    if (!target)
        return null;
    target.status = status;
    return target;
}
function registerReportHandler(nsp, socket) {
    const user = socket.data.user;
    const admin = isAdmin(user.name);
    if (admin) {
        socket.join(ADMINS_ROOM);
        console.log(`[report] admin joined: ${user.name} (${user.id})`);
    }
    socket.on("report:list", (ack) => {
        if (!admin)
            return ack({ reports: [] });
        ack({ reports: reports.map(toDTO) });
    });
    socket.on("report:emit", (data, ack) => {
        if (!data || !data.postId || !data.postSnapshot || !data.reason) {
            return ack({ ok: false, error: "invalid_payload" });
        }
        const report = {
            id: (0, node_crypto_1.randomUUID)(),
            reporterId: user.id,
            reporterName: user.name,
            postId: data.postId,
            postOwnerId: data.postOwnerId,
            postSnapshot: data.postSnapshot,
            reason: data.reason.slice(0, 1000),
            status: "pending",
            createdAt: Date.now(),
        };
        pushReport(report);
        nsp.to(ADMINS_ROOM).emit("report:new", toDTO(report));
        ack({ ok: true });
    });
    socket.on("report:approve", (data, ack) => {
        if (!admin)
            return ack({ ok: false, error: "forbidden" });
        if (!(data === null || data === void 0 ? void 0 : data.reportId))
            return ack({ ok: false, error: "invalid_payload" });
        const updated = setStatus(data.reportId, "approved");
        if (!updated)
            return ack({ ok: false, error: "not_found" });
        nsp.to(ADMINS_ROOM).emit("report:status-update", {
            reportId: updated.id,
            status: updated.status,
            postId: updated.postId,
        });
        nsp.emit("report:post-removed", {
            postId: updated.postId,
            postOwnerId: updated.postOwnerId,
        });
        ack({ ok: true });
    });
    socket.on("report:reject", (data, ack) => {
        if (!admin)
            return ack({ ok: false, error: "forbidden" });
        if (!(data === null || data === void 0 ? void 0 : data.reportId))
            return ack({ ok: false, error: "invalid_payload" });
        const updated = setStatus(data.reportId, "rejected");
        if (!updated)
            return ack({ ok: false, error: "not_found" });
        nsp.to(ADMINS_ROOM).emit("report:status-update", {
            reportId: updated.id,
            status: updated.status,
            postId: updated.postId,
        });
        ack({ ok: true });
    });
}
