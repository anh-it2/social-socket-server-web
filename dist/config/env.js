"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
/**
 * Shared config. JWT_SECRET MUST match social-platform-be — the socket
 * server only verifies tokens that BE signed; it never issues them.
 */
function required(name, fallback) {
    const value = process.env[name];
    if (value && value.length > 0)
        return value;
    if (process.env.NODE_ENV === "production") {
        throw new Error(`Missing required env var: ${name}`);
    }
    return fallback;
}
exports.env = {
    port: parseInt(process.env.PORT || "3002", 10),
    // Must equal social-platform-be JWT_SECRET (default keeps dev working).
    jwtSecret: required("JWT_SECRET", "change-me-in-production"),
    // Exact browser origin of the Next client. Wildcard is invalid once
    // credentials (cookies) are in play, so this must be explicit.
    clientOrigin: (_a = process.env.CLIENT_ORIGIN) !== null && _a !== void 0 ? _a : "http://localhost:3000",
};
