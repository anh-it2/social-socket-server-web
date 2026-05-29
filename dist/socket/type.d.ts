import type { Server } from "socket.io";
import type { User } from "../shared/type";
export interface InternalServerEvents {
    ping: () => void;
}
export interface SocketData {
    user: User;
}
export type IOServer = Server<Record<string, never>, {
    "connection:error": (error: {
        message: string;
        code: string;
    }) => void;
}, InternalServerEvents, SocketData>;
