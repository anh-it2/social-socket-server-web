import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import type { IOServer } from "./type";
import { authMiddleware } from "./middleware/auth";
import { registerChatHandler } from "../feature/chat/chat.handler";
import { registerPresenceHandler } from "../feature/presence/presence.handler";
import { registerNotificationHandler } from "../feature/notification/notification.handler";
import { registerReportHandler } from "../feature/admin/report.handler";
import { registerFeedHandler } from "../feature/feed/feed.handler";
import type { ChatNamespace } from "../feature/chat/type";
import type { PresenceNamespace } from "../feature/presence/type";
import type { NotificationNamespace } from "../feature/notification/type";
import type { ReportNamespace } from "../feature/admin/type";
import type { FeedNamespace } from "../feature/feed/type";

export function setupSocketServer(httpServer: HttpServer): IOServer {
  const io: IOServer = new Server(httpServer, {
    cors: {
      // Must be the exact client origin (not "*") because the handshake
      // now carries the auth cookie (credentials).
      origin: env.clientOrigin,
      credentials: true,
    },
    pingInterval: 25_000,
    pingTimeout: 20_000,
    maxHttpBufferSize: 1e6,
  });

  const chatNsp = io.of("/chat") as ChatNamespace;
  const presenceNsp = io.of("/presence") as PresenceNamespace;
  const notificationNsp = io.of("/notification") as NotificationNamespace;
  const reportNsp = io.of("/report") as ReportNamespace;
  const feedNsp = io.of("/feed") as FeedNamespace;

  chatNsp.use(authMiddleware);
  presenceNsp.use(authMiddleware);
  notificationNsp.use(authMiddleware);
  reportNsp.use(authMiddleware);
  feedNsp.use(authMiddleware);

  function logEvents(
    tag: string,
    socket: {
      data: { user: { name: string; id: string } };
      id: string;
      onAny: (fn: (event: string, ...args: unknown[]) => void) => void;
    },
  ) {
    const user = socket.data.user;
    console.log(`[${tag}] → connected  ${user.name} (${user.id})  sid=${socket.id}`);
    socket.onAny((event, ...args) => {
      const payload = args
        .filter((a) => typeof a !== "function")
        .map((a) => {
          try {
            return JSON.stringify(a);
          } catch {
            return String(a);
          }
        })
        .join(" ");
      console.log(`[${tag}] ⇠ ${event}  ${user.name}  ${payload}`);
    });
  }

  chatNsp.on("connection", async (socket) => {
    logEvents("chat", socket);
    await registerChatHandler(chatNsp, socket);
    socket.on("disconnect", (reason) => {
      console.log(`[chat] ← disconnected  ${socket.data.user.name}  reason=${reason}`);
    });
  });

  presenceNsp.on("connection", (socket) => {
    logEvents("presence", socket);
    registerPresenceHandler(presenceNsp, socket);
    socket.on("disconnect", (reason) => {
      console.log(`[presence] ← disconnected  ${socket.data.user.name}  reason=${reason}`);
    });
  });

  notificationNsp.on("connection", (socket) => {
    logEvents("notification", socket);
    registerNotificationHandler(notificationNsp, socket);
    socket.on("disconnect", (reason) => {
      console.log(`[notification] ← disconnected  ${socket.data.user.name}  reason=${reason}`);
    });
  });

  reportNsp.on("connection", (socket) => {
    logEvents("report", socket);
    registerReportHandler(reportNsp, notificationNsp, socket);
    socket.on("disconnect", (reason) => {
      console.log(`[report] ← disconnected  ${socket.data.user.name}  reason=${reason}`);
    });
  });

  feedNsp.on("connection", (socket) => {
    logEvents("feed", socket);
    registerFeedHandler(socket);
    socket.on("disconnect", (reason) => {
      console.log(`[feed] ← disconnected  ${socket.data.user.name}  reason=${reason}`);
    });
  });

  return io;
}
