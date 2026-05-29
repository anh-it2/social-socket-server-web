import { z } from "zod";
/**
 * Handshake `auth` is now DISPLAY-ONLY. Identity (`id`) comes from the
 * verified JWT cookie — never from here — so a client cannot spoof a userId.
 * userName/avatar are non-authoritative presentation hints.
 */
export declare const authSchema: z.ZodObject<{
    userName: z.ZodOptional<z.ZodString>;
    avatar: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
