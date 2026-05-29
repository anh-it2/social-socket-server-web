import { createServer } from "http";
import { env } from "./config/env";
import { setupSocketServer } from "./socket/setup";

const port = env.port;

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "social-socket-server" }));
});

const io = setupSocketServer(httpServer);

// Catch handshake-level failures (CORS reject, transport, auth) that never
// reach a namespace "connection" handler — the usual reason a client "can't
// connect" with no other log line.
io.engine.on("connection_error", (err) => {
  console.error(
    `[engine] connection_error code=${err.code} msg="${err.message}" ` +
      `origin="${err.req?.headers?.origin ?? "-"}" ` +
      `hasCookie=${Boolean(err.req?.headers?.cookie)}`,
  );
});

httpServer.listen(port, () => {
  console.log(`\n  > Social socket server running on http://localhost:${port}`);
  console.log(`  > Mode: ${process.env.NODE_ENV ?? "development"}`);
  console.log(`  > CLIENT_ORIGIN (CORS) = ${env.clientOrigin}`);
  console.log(`  > JWT_SECRET set = ${env.jwtSecret !== "change-me-in-production"}\n`);
});
