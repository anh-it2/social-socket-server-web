/**
 * Report DTOs — must match frontend src/feature/admin/dto/report.dto.ts.
 * Post snapshot kept opaque (passed through verbatim) since this server has
 * no notion of feed posts.
 */

export type ReportStatus = "pending" | "approved" | "rejected";

export interface FeedAuthorDTO {
  id?: string;
  name: string;
  initial: string;
  gradient: [string, string];
}

export interface FeedPostSnapshotDTO {
  id: string;
  ownerId?: string;
  author: FeedAuthorDTO;
  time: string;
  createdAt?: number;
  text: string;
  imageGradient?: [string, string, string];
  imageUrl?: string;
  videoUrl?: string;
  feeling?: { id: string; emoji: string; label: string; kind: "feeling" | "activity" };
  isLive?: boolean;
  likes: string;
  comments: number;
  shares: number;
  // permissive: server does not validate every nested field
  [key: string]: unknown;
}

// ─── Server → Client DTOs ───────────────────────────────────────────

export interface ReportDTO {
  id: string;
  reporterId: string;
  reporterName: string;
  postId: string;
  postOwnerId?: string;
  postSnapshot: FeedPostSnapshotDTO;
  reason: string;
  status: ReportStatus;
  createdAt: number;
}

export interface ReportListResponseDTO {
  reports: ReportDTO[];
}

export interface ReportActionAck {
  ok: boolean;
  error?: string;
}

export interface ReportStatusUpdateDTO {
  reportId: string;
  status: ReportStatus;
  postId: string;
}

export interface ReportPostRemovedDTO {
  postId: string;
  postOwnerId?: string;
}

// ─── Client → Server DTOs ───────────────────────────────────────────

export interface ReportDecisionDTO {
  reportId: string;
  postId: string;
  postOwnerId?: string;
}

// ─── Socket.IO event maps ───────────────────────────────────────────
// Relay-only: the BE persists reports (source of truth); these events just
// fan out already-persisted data so connected admins/clients update live.

export interface ReportClientToServerEvents {
  "report:emit": (
    data: ReportDTO,
    ack: (res: ReportActionAck) => void,
  ) => void;
  "report:approve": (
    data: ReportDecisionDTO,
    ack: (res: ReportActionAck) => void,
  ) => void;
  "report:reject": (
    data: ReportDecisionDTO,
    ack: (res: ReportActionAck) => void,
  ) => void;
}

export interface ReportServerToClientEvents {
  "report:new": (report: ReportDTO) => void;
  "report:status-update": (data: ReportStatusUpdateDTO) => void;
  "report:post-removed": (data: ReportPostRemovedDTO) => void;
}
