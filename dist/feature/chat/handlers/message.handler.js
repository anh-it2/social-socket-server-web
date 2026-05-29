"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerMessageHandlers = registerMessageHandlers;
const node_crypto_1 = require("node:crypto");
const message_store_1 = require("../store/message.store");
const group_store_1 = require("../store/group.store");
const broadcast_1 = require("../util/broadcast");
const reply_1 = require("../util/reply");
function registerMessageHandlers(nsp, socket) {
    const user = socket.data.user;
    socket.on("chat:history", async (data, ack) => {
        ack(await (0, message_store_1.getHistory)(data.conversationId, data.cursor, data.limit));
    });
    socket.on("chat:message", async (data, ack) => {
        var _a, _b;
        if (data.conversationId.startsWith("group:")) {
            const group = (0, group_store_1.getGroup)(data.conversationId);
            const baseError = {
                id: "",
                conversationId: data.conversationId,
                senderId: user.id,
                senderName: user.name,
                content: data.content,
                type: (_a = data.type) !== null && _a !== void 0 ? _a : "text",
                timestamp: Date.now(),
            };
            if (!group || !group.memberIds.includes(user.id)) {
                return ack(Object.assign(Object.assign({}, baseError), { error: "not_member" }));
            }
            if (group.mutedMembers.includes(user.id)) {
                return ack(Object.assign(Object.assign({}, baseError), { error: "muted" }));
            }
        }
        const replyTo = await (0, reply_1.buildReplyContext)(data.conversationId, data.replyTo);
        const message = Object.assign({ id: (0, node_crypto_1.randomUUID)(), conversationId: data.conversationId, senderId: user.id, senderName: user.name, content: data.content, type: (_b = data.type) !== null && _b !== void 0 ? _b : "text", timestamp: Date.now() }, (replyTo ? { replyTo } : {}));
        await (0, message_store_1.addMessage)(data.conversationId, message);
        (0, broadcast_1.broadcast)(nsp, data.conversationId, user.id, (target) => target.emit("chat:message", message));
        ack(message);
    });
    socket.on("chat:edit", async (data, ack) => {
        const target = await (0, message_store_1.findMessage)(data.conversationId, data.messageId);
        const editedAt = Date.now();
        if (target) {
            if (target.senderId !== user.id) {
                return ack({ ok: false, error: "forbidden" });
            }
            if (target.deleted)
                return ack({ ok: false, error: "deleted" });
            if (target.type !== "text") {
                return ack({ ok: false, error: "non_editable" });
            }
            await (0, message_store_1.editMessage)(data.conversationId, data.messageId, data.content, editedAt);
        }
        (0, broadcast_1.broadcast)(nsp, data.conversationId, user.id, (t) => t.emit("chat:edited", {
            conversationId: data.conversationId,
            messageId: data.messageId,
            content: data.content,
            editedAt,
        }));
        ack({ ok: true });
    });
    socket.on("chat:unsend", async (data, ack) => {
        const target = await (0, message_store_1.findMessage)(data.conversationId, data.messageId);
        if (target) {
            if (target.senderId !== user.id) {
                return ack({ ok: false, error: "forbidden" });
            }
            await (0, message_store_1.unsendMessage)(data.conversationId, data.messageId);
        }
        (0, broadcast_1.broadcast)(nsp, data.conversationId, user.id, (t) => t.emit("chat:unsent", {
            conversationId: data.conversationId,
            messageId: data.messageId,
        }));
        ack({ ok: true });
    });
}
