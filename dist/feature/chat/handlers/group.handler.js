"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerGroupHandlers = registerGroupHandlers;
const node_crypto_1 = require("node:crypto");
const message_store_1 = require("../store/message.store");
const group_store_1 = require("../store/group.store");
const user_sockets_store_1 = require("../store/user-sockets.store");
function joinGroupRoom(nsp, conversationId, userId) {
    const sockets = (0, user_sockets_store_1.getUserSockets)(userId);
    if (!sockets)
        return;
    for (const sid of sockets) {
        const s = nsp.sockets.get(sid);
        if (s)
            s.join(`chat:${conversationId}`);
    }
}
function leaveGroupRoom(nsp, conversationId, userId) {
    const sockets = (0, user_sockets_store_1.getUserSockets)(userId);
    if (!sockets)
        return;
    for (const sid of sockets) {
        const s = nsp.sockets.get(sid);
        if (s)
            s.leave(`chat:${conversationId}`);
    }
}
function broadcastGroupUpdated(nsp, record) {
    const dto = (0, group_store_1.toGroupDto)(record);
    for (const memberId of record.memberIds) {
        nsp.to(`user:${memberId}`).emit("group:updated", dto);
    }
    // belt-and-suspenders: also fan out via the chat room so any currently-open
    // chat view receives the refresh even if the per-user route misses.
    nsp.to(`chat:${record.conversationId}`).emit("group:updated", dto);
}
async function emitGroupSystemMessage(nsp, conversationId, content) {
    const message = {
        id: (0, node_crypto_1.randomUUID)(),
        conversationId,
        senderId: "system",
        senderName: "",
        content,
        timestamp: Date.now(),
        type: "system",
    };
    // Persist before broadcasting so the event is in history if a peer
    // immediately requests it (same order as the chat:message handler).
    await (0, message_store_1.addMessage)(conversationId, message);
    nsp.to(`chat:${conversationId}`).emit("chat:message", message);
}
async function deleteGroup(nsp, conversationId, reason = "deleted") {
    const record = (0, group_store_1.getGroup)(conversationId);
    if (!record)
        return;
    const allWhoSawIt = new Set([
        ...record.memberIds,
        ...record.blockedMembers,
    ]);
    for (const uid of allWhoSawIt) {
        (0, group_store_1.removeUserFromGroup)(uid, conversationId);
        leaveGroupRoom(nsp, conversationId, uid);
        nsp.to(`user:${uid}`).emit("group:deleted", { conversationId, reason });
    }
    (0, group_store_1.deleteGroupRecord)(conversationId);
    await (0, message_store_1.deleteConversationMessages)(conversationId);
}
async function autoDeleteIfTooSmall(nsp, record) {
    if (record.memberIds.length < 3) {
        await deleteGroup(nsp, record.conversationId, "dissolved");
        return true;
    }
    return false;
}
function registerGroupHandlers(nsp, socket) {
    const user = socket.data.user;
    socket.on("group:create", (data, ack) => {
        var _a;
        const uniqueMembers = Array.from(new Set([user.id, ...data.memberIds].filter(Boolean)));
        if (uniqueMembers.length < 3) {
            return ack({ ok: false, error: "min_members" });
        }
        const trimmed = ((_a = data.name) !== null && _a !== void 0 ? _a : "").trim();
        if (trimmed.length > 60) {
            return ack({ ok: false, error: "name_too_long" });
        }
        const conversationId = `group:${(0, node_crypto_1.randomUUID)()}`;
        const record = {
            conversationId,
            name: trimmed || uniqueMembers.slice(0, 3).join(", "),
            memberIds: uniqueMembers,
            adminIds: [user.id],
            mutedMembers: [],
            blockedMembers: [],
            createdAt: Date.now(),
            createdBy: user.id,
        };
        (0, group_store_1.saveGroup)(record);
        for (const memberId of uniqueMembers) {
            (0, group_store_1.addUserToGroup)(memberId, conversationId);
            joinGroupRoom(nsp, conversationId, memberId);
        }
        const payload = (0, group_store_1.toGroupDto)(record);
        for (const memberId of uniqueMembers) {
            nsp.to(`user:${memberId}`).emit("group:created", payload);
        }
        ack({ ok: true, conversationId });
    });
    socket.on("group:leave", async (data, ack) => {
        const record = (0, group_store_1.getGroup)(data.conversationId);
        if (!record)
            return ack({ ok: false, error: "not_found" });
        if (!record.memberIds.includes(user.id)) {
            return ack({ ok: false, error: "not_member" });
        }
        if ((0, group_store_1.isAdmin)(record, user.id) &&
            record.adminIds.length === 1 &&
            record.memberIds.length > 1) {
            return ack({ ok: false, error: "must_transfer_admin" });
        }
        // emit system message BEFORE removing leaver, while still in chat room
        await emitGroupSystemMessage(nsp, data.conversationId, `${user.name} đã rời nhóm`);
        record.memberIds = record.memberIds.filter((id) => id !== user.id);
        record.adminIds = record.adminIds.filter((id) => id !== user.id);
        record.mutedMembers = record.mutedMembers.filter((id) => id !== user.id);
        record.blockedMembers = record.blockedMembers.filter((id) => id !== user.id);
        (0, group_store_1.removeUserFromGroup)(user.id, data.conversationId);
        leaveGroupRoom(nsp, data.conversationId, user.id);
        nsp.to(`user:${user.id}`).emit("group:deleted", {
            conversationId: data.conversationId,
            reason: "left",
        });
        if (!(await autoDeleteIfTooSmall(nsp, record))) {
            broadcastGroupUpdated(nsp, record);
        }
        ack({ ok: true });
    });
    socket.on("group:kick", async (data, ack) => {
        var _a;
        const record = (0, group_store_1.getGroup)(data.conversationId);
        if (!record)
            return ack({ ok: false, error: "not_found" });
        if (!(0, group_store_1.isAdmin)(record, user.id)) {
            return ack({ ok: false, error: "forbidden" });
        }
        if (data.targetUserId === user.id) {
            return ack({ ok: false, error: "cannot_kick_self" });
        }
        if (!record.memberIds.includes(data.targetUserId)) {
            return ack({ ok: false, error: "not_member" });
        }
        const targetLabel = ((_a = data.targetName) === null || _a === void 0 ? void 0 : _a.trim()) || data.targetUserId;
        // emit system message BEFORE removing target, while still in chat room
        await emitGroupSystemMessage(nsp, data.conversationId, `${targetLabel} đã bị xóa khỏi nhóm`);
        record.memberIds = record.memberIds.filter((id) => id !== data.targetUserId);
        record.adminIds = record.adminIds.filter((id) => id !== data.targetUserId);
        record.mutedMembers = record.mutedMembers.filter((id) => id !== data.targetUserId);
        record.blockedMembers = record.blockedMembers.filter((id) => id !== data.targetUserId);
        (0, group_store_1.removeUserFromGroup)(data.targetUserId, data.conversationId);
        leaveGroupRoom(nsp, data.conversationId, data.targetUserId);
        nsp.to(`user:${data.targetUserId}`).emit("group:deleted", {
            conversationId: data.conversationId,
            reason: "kicked",
        });
        if (!(await autoDeleteIfTooSmall(nsp, record))) {
            broadcastGroupUpdated(nsp, record);
        }
        ack({ ok: true });
    });
    socket.on("group:promote", (data, ack) => {
        const record = (0, group_store_1.getGroup)(data.conversationId);
        if (!record)
            return ack({ ok: false, error: "not_found" });
        if (!(0, group_store_1.isAdmin)(record, user.id)) {
            return ack({ ok: false, error: "forbidden" });
        }
        if (!record.memberIds.includes(data.targetUserId)) {
            return ack({ ok: false, error: "not_member" });
        }
        if (!record.adminIds.includes(data.targetUserId)) {
            record.adminIds = [...record.adminIds, data.targetUserId];
        }
        broadcastGroupUpdated(nsp, record);
        ack({ ok: true });
    });
    socket.on("group:mute-member", (data, ack) => {
        const record = (0, group_store_1.getGroup)(data.conversationId);
        if (!record)
            return ack({ ok: false, error: "not_found" });
        if (!(0, group_store_1.isAdmin)(record, user.id)) {
            return ack({ ok: false, error: "forbidden" });
        }
        if (!record.memberIds.includes(data.targetUserId)) {
            return ack({ ok: false, error: "not_member" });
        }
        const exists = record.mutedMembers.includes(data.targetUserId);
        if (data.on && !exists) {
            record.mutedMembers = [...record.mutedMembers, data.targetUserId];
        }
        else if (!data.on && exists) {
            record.mutedMembers = record.mutedMembers.filter((id) => id !== data.targetUserId);
        }
        broadcastGroupUpdated(nsp, record);
        ack({ ok: true });
    });
    socket.on("group:block-member", (data, ack) => {
        const record = (0, group_store_1.getGroup)(data.conversationId);
        if (!record)
            return ack({ ok: false, error: "not_found" });
        if (!(0, group_store_1.isAdmin)(record, user.id)) {
            return ack({ ok: false, error: "forbidden" });
        }
        if (!record.memberIds.includes(data.targetUserId)) {
            return ack({ ok: false, error: "not_member" });
        }
        const exists = record.blockedMembers.includes(data.targetUserId);
        if (data.on && !exists) {
            record.blockedMembers = [...record.blockedMembers, data.targetUserId];
            leaveGroupRoom(nsp, data.conversationId, data.targetUserId);
        }
        else if (!data.on && exists) {
            record.blockedMembers = record.blockedMembers.filter((id) => id !== data.targetUserId);
            joinGroupRoom(nsp, data.conversationId, data.targetUserId);
        }
        broadcastGroupUpdated(nsp, record);
        ack({ ok: true });
    });
    socket.on("group:delete", async (data, ack) => {
        const record = (0, group_store_1.getGroup)(data.conversationId);
        if (!record)
            return ack({ ok: false, error: "not_found" });
        if (!(0, group_store_1.isAdmin)(record, user.id)) {
            return ack({ ok: false, error: "forbidden" });
        }
        await deleteGroup(nsp, data.conversationId, "deleted");
        ack({ ok: true });
    });
}
