"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPresenceHandler = registerPresenceHandler;
const onlineUsers = new Map();
function registerPresenceHandler(nsp, socket) {
    const user = socket.data.user;
    const onlineUser = {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
    };
    onlineUsers.set(user.id, onlineUser);
    socket.broadcast.emit("presence:user-joined", onlineUser);
    socket.on("presence:get-online-users", (ack) => {
        ack([...onlineUsers.values()]);
    });
    socket.on("presence:update-profile", (payload) => {
        const current = onlineUsers.get(user.id);
        if (!current)
            return;
        if (payload.avatar !== undefined)
            current.avatar = payload.avatar;
        if (payload.name)
            current.name = payload.name;
        onlineUsers.set(user.id, current);
        socket.broadcast.emit("presence:user-updated", current);
    });
    socket.on("disconnect", () => {
        onlineUsers.delete(user.id);
        nsp.emit("presence:user-left", user.id);
    });
}
