"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoomHandlers = registerRoomHandlers;
const pin_store_1 = require("../store/pin.store");
function registerRoomHandlers(_nsp, socket) {
    socket.on("chat:join", (conversationId) => {
        socket.join(`chat:${conversationId}`);
        const pins = (0, pin_store_1.getPinned)(conversationId);
        if (pins && pins.length) {
            socket.emit("chat:pins-replay", { conversationId, pinned: pins });
        }
    });
    socket.on("chat:leave", (conversationId) => {
        socket.leave(`chat:${conversationId}`);
    });
}
