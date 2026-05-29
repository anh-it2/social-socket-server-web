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
(0, setup_1.setupSocketServer)(httpServer);
httpServer.listen(port, () => {
    var _a;
    console.log(`\n  > Social socket server running on http://localhost:${port}`);
    console.log(`  > Mode: ${(_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : "development"}\n`);
});
