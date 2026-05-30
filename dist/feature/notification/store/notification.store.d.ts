import type { NotificationDTO } from "../dto/notification.dto";
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
