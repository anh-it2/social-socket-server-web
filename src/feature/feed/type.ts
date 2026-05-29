import type { Namespace, Socket } from "socket.io";
import type { InternalServerEvents, SocketData } from "../../socket/type";
import type {
  FeedClientToServerEvents,
  FeedServerToClientEvents,
} from "./dto/feed.dto";

export type {
  FeedClientToServerEvents,
  FeedServerToClientEvents,
} from "./dto/feed.dto";

export type FeedNamespace = Namespace<
  FeedClientToServerEvents,
  FeedServerToClientEvents,
  InternalServerEvents,
  SocketData
>;

export type FeedSocket = Socket<
  FeedClientToServerEvents,
  FeedServerToClientEvents,
  InternalServerEvents,
  SocketData
>;
