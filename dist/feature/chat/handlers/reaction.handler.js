"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerReactionHandlers = registerReactionHandlers;
const chat_dto_1 = require("../dto/chat.dto");
const message_store_1 = require("../store/message.store");
const broadcast_1 = require("../util/broadcast");
function isReactionKey(v) {
    return typeof v === "string" && chat_dto_1.REACTION_KEYS.includes(v);
}
function registerReactionHandlers(nsp, socket) {
    const user = socket.data.user;
    socket.on("chat:react", async (data, ack) => {
        if (data.emoji !== null && !isReactionKey(data.emoji)) {
            return ack({ ok: false, error: "invalid_emoji" });
        }
        const msg = await (0, message_store_1.findMessage)(data.conversationId, data.messageId);
        if (!msg || msg.deleted || msg.type === "system") {
            return ack({ ok: false, error: "not_found" });
        }
        // One reaction per user, enforced by the (messageId,userId) PK:
        // emoji set = upsert (react / replace), null = remove.
        await (0, message_store_1.applyReaction)(data.messageId, user.id, user.name, data.emoji);
        (0, broadcast_1.broadcastToConversation)(nsp, data.conversationId, (t) => t.emit("chat:reacted", {
            conversationId: data.conversationId,
            messageId: data.messageId,
            messageOwnerId: msg.senderId,
            userId: user.id,
            userName: user.name,
            emoji: data.emoji,
        }));
        ack({ ok: true });
    });
}
