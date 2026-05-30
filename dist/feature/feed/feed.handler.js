"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFeedHandler = registerFeedHandler;
/**
 * Realtime feed fan-out. social-platform-be (REST) already persisted the
 * post before the client emits here — this server is a best-effort relay
 * (the presence pattern), it does NOT touch the DB. `socket.broadcast`
 * delivers to every OTHER connected client; the author's own UI already
 * reconciled via its mutation's query invalidation, so it must not receive
 * its own echo.
 *
 * Auth note: the namespace `authMiddleware` already verified the JWT, so a
 * connected socket is a real user. The post body is opaque and only
 * fanned out for display — it is never trusted as a write.
 */
function registerFeedHandler(socket) {
    socket.on("feed:publish", (post) => {
        if (!(post === null || post === void 0 ? void 0 : post.id))
            return;
        socket.broadcast.emit("feed:new", post);
    });
    socket.on("feed:update", (post) => {
        if (!(post === null || post === void 0 ? void 0 : post.id))
            return;
        socket.broadcast.emit("feed:update", post);
    });
    socket.on("feed:remove", (data) => {
        if (!(data === null || data === void 0 ? void 0 : data.id))
            return;
        socket.broadcast.emit("feed:remove", data);
    });
}
