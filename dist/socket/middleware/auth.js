"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../../config/env");
const auth_schema_1 = require("./auth.schema");
/** Minimal `Cookie:` header parser — avoids a dep for one lookup. */
function readCookie(header, name) {
    if (!header)
        return null;
    for (const part of header.split(";")) {
        const eq = part.indexOf("=");
        if (eq === -1)
            continue;
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
function authMiddleware(socket, next) {
    var _a;
    const nsp = socket.nsp.name;
    const origin = (_a = socket.handshake.headers.origin) !== null && _a !== void 0 ? _a : "-";
    const hasCookieHeader = Boolean(socket.handshake.headers.cookie);
    // Primary: httpOnly `token` cookie (works same-site, e.g. localhost dev).
    // Fallback: token in the handshake `auth` payload — REQUIRED in production
    // where FE (vercel) and this server (render) are different domains, so the
    // browser never sends the FE cookie here. The FE fetches the token from its
    // own same-origin /api/socket-token route and passes it in `auth`.
    const cookieToken = readCookie(socket.handshake.headers.cookie, "token");
    const handshakeAuth = socket.handshake.auth;
    const authToken = typeof (handshakeAuth === null || handshakeAuth === void 0 ? void 0 : handshakeAuth.token) === "string" ? handshakeAuth.token : null;
    const token = cookieToken !== null && cookieToken !== void 0 ? cookieToken : authToken;
    const source = cookieToken ? "cookie" : authToken ? "handshake" : "none";
    if (!token) {
        console.warn(`[auth] REJECT AUTH_REQUIRED nsp=${nsp} origin=${origin} ` +
            `cookieHeader=${hasCookieHeader} tokenCookie=false handshakeToken=false`);
        return next(new Error("AUTH_REQUIRED"));
    }
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
    }
    catch (e) {
        console.warn(`[auth] REJECT AUTH_INVALID (verify failed) nsp=${nsp} origin=${origin} ` +
            `reason="${e.message}"`);
        return next(new Error("AUTH_INVALID"));
    }
    if (!(payload === null || payload === void 0 ? void 0 : payload.sub)) {
        console.warn(`[auth] REJECT AUTH_INVALID (no sub) nsp=${nsp} origin=${origin}`);
        return next(new Error("AUTH_INVALID"));
    }
    console.log(`[auth] OK nsp=${nsp} user=${payload.sub} origin=${origin} source=${source}`);
    const hints = auth_schema_1.authSchema.safeParse(socket.handshake.auth);
    socket.data.user = {
        id: payload.sub,
        name: (hints.success && hints.data.userName) || "Anonymous",
        avatar: hints.success ? hints.data.avatar : undefined,
        role: payload.role,
    };
    next();
}
