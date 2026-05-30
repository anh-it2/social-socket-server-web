import type { NotificationDTO } from "../dto/notification.dto";
/**
 * User ids with role ADMIN — recipients for "new report" notifications.
 * Raw SQL because this server's Prisma schema is a minimal mirror that only
 * declares Message/MessageReaction (no User model), but the same DB has the
 * `users` table owned by social-network-system.
 */
export declare function listAdminIds(): Promise<string[]>;
type Kind = NotificationDTO["kind"];
export declare function listNotifications(userId: string): Promise<NotificationDTO[]>;
export interface CreateNotificationInput {
    recipientId: string;
    actorId: string;
    actorName: string;
    kind: Kind;
    postId?: string;
    preview?: string;
}
export declare function createNotification(input: CreateNotificationInput): Promise<NotificationDTO | null>;
export declare function markRead(userId: string, notificationId: string): Promise<boolean>;
export declare function markAllRead(userId: string): Promise<void>;
export {};
