import type { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import type { SocketData } from "../type";
import { authSchema } from "./auth.schema";

type AuthSocket = Socket<any, any, any, SocketData>;

/** JWT payload issued by social-platform-be: { sub: userId, email }. */
interface TokenPayload {
  sub: string;
  email: string;
}

/** Minimal `Cookie:` header parser — avoids a dep for one lookup. */
function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

/**
 * Per-namespace auth. Identity is taken from the JWT in the httpOnly
 * `token` cookie (signed by social-platform-be), NOT from handshake auth —
 * so a client cannot claim another user's id. userName/avatar from the
 * handshake are kept only as display hints.
 *
 * Applied via `namespace.use(authMiddleware)` for each non-root namespace,
 * because `io.use(...)` only covers the default namespace `/`.
 */
export function authMiddleware(
  socket: AuthSocket,
  next: (error?: Error) => void,
) {
  const token = readCookie(socket.handshake.headers.cookie, "token");
  if (!token) {
    return next(new Error("AUTH_REQUIRED"));
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch {
    return next(new Error("AUTH_INVALID"));
  }
  if (!payload?.sub) {
    return next(new Error("AUTH_INVALID"));
  }

  const hints = authSchema.safeParse(socket.handshake.auth);

  socket.data.user = {
    id: payload.sub,
    name: (hints.success && hints.data.userName) || "Anonymous",
    avatar: hints.success ? hints.data.avatar : undefined,
  };

  next();
}
