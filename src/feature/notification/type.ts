import type { Namespace, Socket } from "socket.io";
import type { InternalServerEvents, SocketData } from "../../socket/type";
import type {
  NotificationClientToServerEvents,
  NotificationServerToClientEvents,
  NotificationKind,
} from "./dto/notification.dto";

export interface Notification {
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

export type {
  NotificationClientToServerEvents,
  NotificationServerToClientEvents,
} from "./dto/notification.dto";

export type NotificationNamespace = Namespace<
  NotificationClientToServerEvents,
  NotificationServerToClientEvents,
  InternalServerEvents,
  SocketData
>;

export type NotificationSocket = Socket<
  NotificationClientToServerEvents,
  NotificationServerToClientEvents,
  InternalServerEvents,
  SocketData
>;
