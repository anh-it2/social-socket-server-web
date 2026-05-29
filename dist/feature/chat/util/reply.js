"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReplyContext = buildReplyContext;
const message_store_1 = require("../store/message.store");
const SNIPPET_MAX = 140;
function snippetFor(type, content) {
    return type === "text" && content.length > SNIPPET_MAX
        ? content.slice(0, SNIPPET_MAX) + "…"
        : content;
}
async function buildReplyContext(conversationId, clientReplyTo) {
    if (!clientReplyTo)
        return undefined;
    const target = await (0, message_store_1.findMessage)(conversationId, clientReplyTo.id);
    if (target && !target.deleted && target.type !== "system") {
        return {
            id: target.id,
            senderId: target.senderId,
            senderName: target.senderName,
            content: snippetFor(target.type, target.content),
            type: target.type,
        };
    }
    return {
        id: clientReplyTo.id,
        senderId: clientReplyTo.senderId,
        senderName: clientReplyTo.senderName,
        content: snippetFor(clientReplyTo.type, clientReplyTo.content),
        type: clientReplyTo.type,
    };
}
