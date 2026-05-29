import type { Namespace, Socket } from "socket.io";
import type { InternalServerEvents, SocketData } from "../../socket/type";
import type { PresenceClientToServerEvents, PresenceServerToClientEvents } from "./dto/presence.dto";
export interface OnlineUser {
    id: string;
    name: string;
    avatar?: string;
}
export type { PresenceClientToServerEvents, PresenceServerToClientEvents, } from "./dto/presence.dto";
export type PresenceNamespace = Namespace<PresenceClientToServerEvents, PresenceServerToClientEvents, InternalServerEvents, SocketData>;
export type PresenceSocket = Socket<PresenceClientToServerEvents, PresenceServerToClientEvents, InternalServerEvents, SocketData>;
