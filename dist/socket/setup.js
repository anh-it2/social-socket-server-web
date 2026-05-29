"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocketServer = setupSocketServer;
const socket_io_1 = require("socket.io");
const env_1 = require("../config/env");
const auth_1 = require("./middleware/auth");
const chat_handler_1 = require("../feature/chat/chat.handler");
const presence_handler_1 = require("../feature/presence/presence.handler");
const notification_handler_1 = require("../feature/notification/notification.handler");
const report_handler_1 = require("../feature/admin/report.handler");
function setupSocketServer(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            // Must be the exact client origin (not "*") because the handshake
            // now carries the auth cookie (credentials).
            origin: env_1.env.clientOrigin,
            credentials: true,
        },
        pingInterval: 25000,
        pingTimeout: 20000,
        maxHttpBufferSize: 1e6,
    });
    const chatNsp = io.of("/chat");
    const presenceNsp = io.of("/presence");
    const notificationNsp = io.of("/notification");
    const reportNsp = io.of("/report");
    chatNsp.use(auth_1.authMiddleware);
    presenceNsp.use(auth_1.authMiddleware);
    notificationNsp.use(auth_1.authMiddleware);
    reportNsp.use(auth_1.authMiddleware);
    function logEvents(tag, socket) {
        const user = socket.data.user;
        console.log(`[${tag}] → connected  ${user.name} (${user.id})  sid=${socket.id}`);
        socket.onAny((event, ...args) => {
            const payload = args
                .filter((a) => typeof a !== "function")
                .map((a) => {
                try {
                    return JSON.stringify(a);
                }
                catch (_a) {
                    return String(a);
                }
            })
                .join(" ");
            console.log(`[${tag}] ⇠ ${event}  ${user.name}  ${payload}`);
        });
    }
    chatNsp.on("connection", async (socket) => {
        logEvents("chat", socket);
        await (0, chat_handler_1.registerChatHandler)(chatNsp, socket);
        socket.on("disconnect", (reason) => {
            console.log(`[chat] ← disconnected  ${socket.data.user.name}  reason=${reason}`);
        });
    });
    presenceNsp.on("connection", (socket) => {
        logEvents("presence", socket);
        (0, presence_handler_1.registerPresenceHandler)(presenceNsp, socket);
        socket.on("disconnect", (reason) => {
            console.log(`[presence] ← disconnected  ${socket.data.user.name}  reason=${reason}`);
        });
    });
    notificationNsp.on("connection", (socket) => {
        logEvents("notification", socket);
        (0, notification_handler_1.registerNotificationHandler)(notificationNsp, socket);
        socket.on("disconnect", (reason) => {
            console.log(`[notification] ← disconnected  ${socket.data.user.name}  reason=${reason}`);
        });
    });
    reportNsp.on("connection", (socket) => {
        logEvents("report", socket);
        (0, report_handler_1.registerReportHandler)(reportNsp, socket);
        socket.on("disconnect", (reason) => {
            console.log(`[report] ← disconnected  ${socket.data.user.name}  reason=${reason}`);
        });
    });
    return io;
}
