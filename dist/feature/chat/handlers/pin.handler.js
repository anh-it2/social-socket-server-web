"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPinHandlers = registerPinHandlers;
const message_store_1 = require("../store/message.store");
const pin_store_1 = require("../store/pin.store");
const broadcast_1 = require("../util/broadcast");
const PIN_SNIPPET_MAX = 200;
function registerPinHandlers(nsp, socket) {
    const user = socket.data.user;
    socket.on("chat:pin", async (data, ack) => {
        var _a, _b, _c;
        const msg = await (0, message_store_1.findMessage)(data.conversationId, data.messageId);
        if ((msg === null || msg === void 0 ? void 0 : msg.deleted) || (msg === null || msg === void 0 ? void 0 : msg.type) === "system") {
            return ack({ ok: false, error: "not_found" });
        }
        // Prefer authoritative server message, fall back to client snippet
        // (handles server restart wiping in-memory messageStore).
        const resolvedType = msg ? msg.type : data.type;
        const resolvedContent = (_a = msg === null || msg === void 0 ? void 0 : msg.content) !== null && _a !== void 0 ? _a : data.content;
        const resolvedSenderId = (_b = msg === null || msg === void 0 ? void 0 : msg.senderId) !== null && _b !== void 0 ? _b : data.senderId;
        const resolvedSenderName = (_c = msg === null || msg === void 0 ? void 0 : msg.senderName) !== null && _c !== void 0 ? _c : data.senderName;
        if (!resolvedType ||
            resolvedContent === undefined ||
            !resolvedSenderId ||
            !resolvedSenderName) {
            return ack({ ok: false, error: "not_found" });
        }
        const list = (0, pin_store_1.getOrCreatePinned)(data.conversationId);
        if (list.some((p) => p.id === data.messageId)) {
            return ack({ ok: true });
        }
        const snippet = resolvedType === "text" && resolvedContent.length > PIN_SNIPPET_MAX
            ? resolvedContent.slice(0, PIN_SNIPPET_MAX) + "…"
            : resolvedContent;
        const pin = {
            id: data.messageId,
            conversationId: data.conversationId,
            content: snippet,
            type: resolvedType,
            senderId: resolvedSenderId,
            senderName: resolvedSenderName,
            pinnedAt: Date.now(),
            pinnedBy: user.id,
            pinnedByName: user.name,
        };
        list.unshift(pin);
        (0, broadcast_1.broadcastToConversation)(nsp, data.conversationId, (t) => t.emit("chat:pinned", pin));
        ack({ ok: true });
    });
    socket.on("chat:unpin", (data, ack) => {
        const list = (0, pin_store_1.getPinned)(data.conversationId);
        if (!list)
            return ack({ ok: true });
        (0, pin_store_1.setPinned)(data.conversationId, list.filter((p) => p.id !== data.messageId));
        (0, broadcast_1.broadcastToConversation)(nsp, data.conversationId, (t) => t.emit("chat:unpinned", {
            conversationId: data.conversationId,
            messageId: data.messageId,
        }));
        ack({ ok: true });
    });
    socket.on("chat:pins-fetch", (data, ack) => {
        var _a;
        ack({
            conversationId: data.conversationId,
            pinned: (_a = (0, pin_store_1.getPinned)(data.conversationId)) !== null && _a !== void 0 ? _a : [],
        });
    });
}
