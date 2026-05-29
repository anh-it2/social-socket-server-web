/**
 * DTOs — exact shape on the wire for the /feed namespace.
 *
 * The post object is built by the FE from the REST create/update response
 * (social-platform-be is the source of truth — see clone-api
 * "persist-then-announce"). This server only fans it out, so the payload is
 * treated as an opaque post snapshot: only `id` is required (used to dedupe
 * / target a removal). Keeping it loose avoids duplicating the full BE
 * PostDTO here and drifting from it.
 */
export interface FeedPostPayload {
  id: string;
  [key: string]: unknown;
}

export interface FeedRemovePayload {
  id: string;
}

// ─── Client → Server ────────────────────────────────────────────────
export interface FeedClientToServerEvents {
  "feed:publish": (post: FeedPostPayload) => void;
  "feed:update": (post: FeedPostPayload) => void;
  "feed:remove": (data: FeedRemovePayload) => void;
}

// ─── Server → Client ────────────────────────────────────────────────
export interface FeedServerToClientEvents {
  "feed:new": (post: FeedPostPayload) => void;
  "feed:update": (post: FeedPostPayload) => void;
  "feed:remove": (data: FeedRemovePayload) => void;
}
