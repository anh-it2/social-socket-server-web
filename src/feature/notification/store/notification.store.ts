import { randomUUID } from "crypto";
import type { NotificationDTO } from "../dto/notification.dto";

// In-memory store. The NestJS BE's `notifications` table has an incompatible
// shape (BigInt ids, NotificationType enum that doesn't carry the kinds this
// server emits — friend_request, share, mention, …), and this server doesn't
// own that table. Until a compatible socket-notifications table exists in
// the BE, notifications stay in process memory and reset on restart.

const MAX_PER_USER = 50;

type Kind = NotificationDTO["kind"];

interface StoredRow {
  id: string;
  recipientId: string;
  actorId: string;
  actorName: string;
  kind: Kind;
  postId?: string;
  preview?: string;
  read: boolean;
  createdAt: number;
}

const byRecipient = new Map<string, StoredRow[]>();

function rowToDTO(row: StoredRow): NotificationDTO {
  return {
    id: row.id,
    recipientId: row.recipientId,
    actorId: row.actorId,
    actorName: row.actorName,
    kind: row.kind,
    ...(row.postId ? { postId: row.postId } : {}),
    ...(row.preview ? { preview: row.preview } : {}),
    read: row.read,
    timestamp: row.createdAt,
  };
}

export async function listNotifications(
  userId: string,
): Promise<NotificationDTO[]> {
  const rows = byRecipient.get(userId) ?? [];
  // Newest-first.
  return rows.slice(0, MAX_PER_USER).map(rowToDTO);
}

export interface CreateNotificationInput {
  recipientId: string;
  actorId: string;
  actorName: string;
  kind: Kind;
  postId?: string;
  preview?: string;
}

export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationDTO | null> {
  const row: StoredRow = {
    id: randomUUID(),
    recipientId: input.recipientId,
    actorId: input.actorId,
    actorName: input.actorName,
    kind: input.kind,
    postId: input.postId,
    preview: input.preview,
    read: false,
    createdAt: Date.now(),
  };
  const list = byRecipient.get(input.recipientId) ?? [];
  // Prepend (newest-first ordering, same as old DB query did).
  list.unshift(row);
  if (list.length > MAX_PER_USER) list.length = MAX_PER_USER;
  byRecipient.set(input.recipientId, list);
  return rowToDTO(row);
}

export async function markRead(
  userId: string,
  notificationId: string,
): Promise<boolean> {
  const list = byRecipient.get(userId);
  if (!list) return false;
  const row = list.find((r) => r.id === notificationId);
  if (!row || row.read) return false;
  row.read = true;
  return true;
}

export async function markAllRead(userId: string): Promise<void> {
  const list = byRecipient.get(userId);
  if (!list) return;
  for (const row of list) row.read = true;
}
