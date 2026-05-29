import type { Socket } from "socket.io";
import type { SocketData } from "../type";
type AuthSocket = Socket<any, any, any, SocketData>;
/**
 * Per-namespace auth. Identity is taken from the JWT in the httpOnly
 * `token` cookie (signed by social-platform-be), NOT from handshake auth —
 * so a client cannot claim another user's id. userName/avatar from the
 * handshake are kept only as display hints.
 *
 * Applied via `namespace.use(authMiddleware)` for each non-root namespace,
 * because `io.use(...)` only covers the default namespace `/`.
 */
export declare function authMiddleware(socket: AuthSocket, next: (error?: Error) => void): void;
export {};
