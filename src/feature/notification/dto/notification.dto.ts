/**
 * DTOs — exact shape of data on the wire.
 * When backend changes a field, update ONLY this file and the mappers.
 */

export type NotificationKind =
  | "like"
  | "comment"
  | "share"
  | "follow"
  | "mention"
  | "friend_request"
  | "friend_accept"
  | "friend_reject";

// ─── Server → Client DTOs ───────────────────────────────────────────

export interface NotificationDTO {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  kind: NotificationKind;
  postId?: string;
  preview?: string;
  read: boolean;
  timestamp: number;
}

export interface NotificationListResponseDTO {
  notifications: NotificationDTO[];
}

export interface FirstUserResponseDTO {
  userId: string | null;
}

export interface NotificationActionAck {
  ok: boolean;
  error?: string;
}

// ─── Client → Server DTOs ───────────────────────────────────────────

export interface EmitNotificationDTO {
  recipientId: string;
  kind: NotificationKind;
  postId?: string;
  preview?: string;
}

export interface MarkReadDTO {
  notificationId: string;
}

// ─── Socket.IO event maps ───────────────────────────────────────────

export interface NotificationClientToServerEvents {
  "notification:first-user": (
    ack: (res: FirstUserResponseDTO) => void,
  ) => void;
  "notification:list": (
    ack: (res: NotificationListResponseDTO) => void,
  ) => void;
  "notification:emit": (
    data: EmitNotificationDTO,
    ack: (res: NotificationActionAck) => void,
  ) => void;
  "notification:read": (
    data: MarkReadDTO,
    ack: (res: NotificationActionAck) => void,
  ) => void;
  "notification:read-all": (
    ack: (res: NotificationActionAck) => void,
  ) => void;
}

export interface NotificationServerToClientEvents {
  "notification:new": (notification: NotificationDTO) => void;
  "notification:read-update": (notificationId: string) => void;
  "notification:read-all-update": () => void;
}
