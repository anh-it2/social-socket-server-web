"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = require("http");
const env_1 = require("./config/env");
const setup_1 = require("./socket/setup");
const port = env_1.env.port;
const httpServer = (0, http_1.createServer)((_req, res) => {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "social-socket-server" }));
});
const io = (0, setup_1.setupSocketServer)(httpServer);
// Catch handshake-level failures (CORS reject, transport, auth) that never
// reach a namespace "connection" handler — the usual reason a client "can't
// connect" with no other log line.
io.engine.on("connection_error", (err) => {
    var _a, _b, _c, _d, _e;
    console.error(`[engine] connection_error code=${err.code} msg="${err.message}" ` +
        `origin="${(_c = (_b = (_a = err.req) === null || _a === void 0 ? void 0 : _a.headers) === null || _b === void 0 ? void 0 : _b.origin) !== null && _c !== void 0 ? _c : "-"}" ` +
        `hasCookie=${Boolean((_e = (_d = err.req) === null || _d === void 0 ? void 0 : _d.headers) === null || _e === void 0 ? void 0 : _e.cookie)}`);
});
httpServer.listen(port, () => {
    var _a;
    console.log(`\n  > Social socket server running on http://localhost:${port}`);
    console.log(`  > Mode: ${(_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : "development"}`);
    console.log(`  > CLIENT_ORIGIN (CORS) = ${env_1.env.clientOrigin}`);
    console.log(`  > JWT_SECRET set = ${env_1.env.jwtSecret !== "change-me-in-production"}\n`);
});
