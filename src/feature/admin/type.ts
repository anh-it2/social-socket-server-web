import type { Namespace, Socket } from "socket.io";
import type { InternalServerEvents, SocketData } from "../../socket/type";
import type {
  ReportClientToServerEvents,
  ReportServerToClientEvents,
  ReportStatus,
  FeedPostSnapshotDTO,
} from "./dto/report.dto";

export interface Report {
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

export type {
  ReportClientToServerEvents,
  ReportServerToClientEvents,
} from "./dto/report.dto";

export type ReportNamespace = Namespace<
  ReportClientToServerEvents,
  ReportServerToClientEvents,
  InternalServerEvents,
  SocketData
>;

export type ReportSocket = Socket<
  ReportClientToServerEvents,
  ReportServerToClientEvents,
  InternalServerEvents,
  SocketData
>;
