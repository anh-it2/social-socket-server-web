import type { NotificationKind } from "@prisma/client";
import type { NotificationDTO } from "../dto/notification.dto";
/** Newest MAX_PER_USER for a recipient, newest-first (old store order). */
export declare function listNotifications(userId: string): Promise<NotificationDTO[]>;
export interface CreateNotificationInput {
    recipientId: string;
    actorId: string;
    actorName: string;
    kind: NotificationKind;
    postId?: string;
    preview?: string;
}
/**
 * Persist one notification and return its wire DTO (so the handler emits
 * exactly what was stored). Returns null on a foreign-key violation —
 * recipientId is client-supplied and may not be a real User row; a bad id
 * must not crash the socket handler.
 */
export declare function createNotification(input: CreateNotificationInput): Promise<NotificationDTO | null>;
/**
 * Mark one notification read. True only when it exists, belongs to the
 * user, and flipped unread→read (drives the read-update broadcast — old
 * `markRead` returned false for an already-read or missing row).
 */
export declare function markRead(userId: string, notificationId: string): Promise<boolean>;
/** Mark every unread notification for the user read. */
export declare function markAllRead(userId: string): Promise<void>;
