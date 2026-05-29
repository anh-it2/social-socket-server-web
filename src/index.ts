import { createServer } from "http";
import { env } from "./config/env";
import { setupSocketServer } from "./socket/setup";

const port = env.port;

const httpServer = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", service: "social-socket-server" }));
});

setupSocketServer(httpServer);

httpServer.listen(port, () => {
  console.log(`\n  > Social socket server running on http://localhost:${port}`);
  console.log(`  > Mode: ${process.env.NODE_ENV ?? "development"}\n`);
});
