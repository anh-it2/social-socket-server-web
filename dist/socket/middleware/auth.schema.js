"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authSchema = void 0;
const zod_1 = require("zod");
/**
 * Handshake `auth` is now DISPLAY-ONLY. Identity (`id`) comes from the
 * verified JWT cookie — never from here — so a client cannot spoof a userId.
 * userName/avatar are non-authoritative presentation hints.
 */
exports.authSchema = zod_1.z.object({
    userName: zod_1.z.string().min(1).optional(),
    avatar: zod_1.z.string().optional(),
});
