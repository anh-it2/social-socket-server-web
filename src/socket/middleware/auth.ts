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
  const nsp = socket.nsp.name;
  const origin = socket.handshake.headers.origin ?? "-";
  const hasCookieHeader = Boolean(socket.handshake.headers.cookie);

  // Primary: httpOnly `token` cookie (works same-site, e.g. localhost dev).
  // Fallback: token in the handshake `auth` payload — REQUIRED in production
  // where FE (vercel) and this server (render) are different domains, so the
  // browser never sends the FE cookie here. The FE fetches the token from its
  // own same-origin /api/socket-token route and passes it in `auth`.
  const cookieToken = readCookie(socket.handshake.headers.cookie, "token");
  const handshakeAuth = socket.handshake.auth as { token?: unknown } | undefined;
  const authToken =
    typeof handshakeAuth?.token === "string" ? handshakeAuth.token : null;
  const token = cookieToken ?? authToken;
  const source = cookieToken ? "cookie" : authToken ? "handshake" : "none";

  if (!token) {
    console.warn(
      `[auth] REJECT AUTH_REQUIRED nsp=${nsp} origin=${origin} ` +
        `cookieHeader=${hasCookieHeader} tokenCookie=false handshakeToken=false`,
    );
    return next(new Error("AUTH_REQUIRED"));
  }

  let payload: TokenPayload;
  try {
    payload = jwt.verify(token, env.jwtSecret) as TokenPayload;
  } catch (e) {
    console.warn(
      `[auth] REJECT AUTH_INVALID (verify failed) nsp=${nsp} origin=${origin} ` +
        `reason="${(e as Error).message}"`,
    );
    return next(new Error("AUTH_INVALID"));
  }
  if (!payload?.sub) {
    console.warn(`[auth] REJECT AUTH_INVALID (no sub) nsp=${nsp} origin=${origin}`);
    return next(new Error("AUTH_INVALID"));
  }

  console.log(
    `[auth] OK nsp=${nsp} user=${payload.sub} origin=${origin} source=${source}`,
  );

  const hints = authSchema.safeParse(socket.handshake.auth);

  socket.data.user = {
    id: payload.sub,
    name: (hints.success && hints.data.userName) || "Anonymous",
    avatar: hints.success ? hints.data.avatar : undefined,
  };

  next();
}
