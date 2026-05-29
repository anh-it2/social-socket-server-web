"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerChatHandler = registerChatHandler;
const message_store_1 = require("./store/message.store");
const group_store_1 = require("./store/group.store");
const user_sockets_store_1 = require("./store/user-sockets.store");
const message_handler_1 = require("./handlers/message.handler");
const typing_read_handler_1 = require("./handlers/typing-read.handler");
const room_handler_1 = require("./handlers/room.handler");
const group_handler_1 = require("./handlers/group.handler");
const pin_handler_1 = require("./handlers/pin.handler");
const reaction_handler_1 = require("./handlers/reaction.handler");
async function flushPendingMessages(socket, userId) {
    const lastSeen = (0, user_sockets_store_1.getLastSeen)(userId);
    // DB query already excludes deleted / own / older-than-lastSeen and is
    // scoped to DM conversations involving this user.
    const pending = await (0, message_store_1.getDirectMessagesSince)(userId, lastSeen);
    for (const m of pending) {
        socket.emit("chat:message", m);
    }
}
function rejoinUserGroups(socket, userId) {
    const memberOf = (0, group_store_1.getUserGroups)(userId);
    if (!memberOf)
        return;
    for (const conversationId of memberOf) {
        const group = (0, group_store_1.getGroup)(conversationId);
        if (!group)
            continue;
        if (!group.blockedMembers.includes(userId)) {
            socket.join(`chat:${conversationId}`);
        }
        socket.emit("group:created", (0, group_store_1.toGroupDto)(group));
    }
}
async function registerChatHandler(nsp, socket) {
    const user = socket.data.user;
    socket.join(`user:${user.id}`);
    const { wasEmpty } = (0, user_sockets_store_1.addUserSocket)(user.id, socket.id);
    rejoinUserGroups(socket, user.id);
    socket.on("disconnect", () => {
        (0, user_sockets_store_1.removeUserSocket)(user.id, socket.id);
    });
    // Register inbound handlers before the awaited flush so no client event
    // sent during the (now async) flush is missed. flushPendingMessages only
    // emits outbound, so its ordering vs handler registration is irrelevant.
    (0, room_handler_1.registerRoomHandlers)(nsp, socket);
    (0, message_handler_1.registerMessageHandlers)(nsp, socket);
    (0, typing_read_handler_1.registerTypingReadHandlers)(nsp, socket);
    (0, group_handler_1.registerGroupHandlers)(nsp, socket);
    (0, pin_handler_1.registerPinHandlers)(nsp, socket);
    (0, reaction_handler_1.registerReactionHandlers)(nsp, socket);
    if (wasEmpty) {
        await flushPendingMessages(socket, user.id);
    }
}
