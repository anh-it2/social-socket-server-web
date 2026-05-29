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
    const token = readCookie(socket.handshake.headers.cookie, "token");
    if (!token) {
        return next(new Error("AUTH_REQUIRED"));
    }
    let payload;
    try {
        payload = jsonwebtoken_1.default.verify(token, env_1.env.jwtSecret);
    }
    catch (_a) {
        return next(new Error("AUTH_INVALID"));
    }
    if (!(payload === null || payload === void 0 ? void 0 : payload.sub)) {
        return next(new Error("AUTH_INVALID"));
    }
    const hints = auth_schema_1.authSchema.safeParse(socket.handshake.auth);
    socket.data.user = {
        id: payload.sub,
        name: (hints.success && hints.data.userName) || "Anonymous",
        avatar: hints.success ? hints.data.avatar : undefined,
    };
    next();
}
