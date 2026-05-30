import type { FeedSocket } from "./type";
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
export declare function registerFeedHandler(socket: FeedSocket): void;
