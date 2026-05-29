import { z } from "zod";

/**
 * Handshake `auth` is now DISPLAY-ONLY. Identity (`id`) comes from the
 * verified JWT cookie — never from here — so a client cannot spoof a userId.
 * userName/avatar are non-authoritative presentation hints.
 */
export const authSchema = z.object({
  userName: z.string().min(1).optional(),
  avatar: z.string().optional(),
});
