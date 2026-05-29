// Drift guard: this socket server's prisma/schema.prisma is a READ-ONLY MIRROR
// of social-network-system (the DB + migration owner — NestJS app serving
// `socialdb` on port 8080). If the BE changes a shared column and this mirror
// isn't updated, the generated Prisma client lies about the real table and
// chat writes fail at runtime — silently until production.
//
// This compares the shared blocks (MessageType / Message / MessageReaction
// byte-equal). Wired into predev/prebuild so it can never be skipped by
// accident.
//
// Notifications are NOT checked: socket-server emits a richer NotificationKind
// (friend_request/share/mention/…) than the BE's NotificationType, and the
// store is in-memory (no BE table touched) until a compatible socket
// notifications table lands in social-network-system.
//
// Override BE schema location with BE_SCHEMA_PATH if the sibling repo moves.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SOCKET_SCHEMA = resolve(here, "../prisma/schema.prisma");
const BE_SCHEMA =
  process.env.BE_SCHEMA_PATH ??
  resolve(here, "../../../../social-network-system/prisma/schema.prisma");

function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    console.error(`[schema-drift] cannot read ${path}`);
    process.exit(1);
  }
}

// Strip comments + blank lines, trim each line. Prisma has no string literals
// at the schema level, so cutting at the first "//" is safe.
function normalizeLines(block) {
  return block
    .split("\n")
    .map((l) => {
      const i = l.indexOf("//");
      return (i === -1 ? l : l.slice(0, i)).trim().replace(/\s+/g, " ");
    })
    .filter((l) => l.length > 0);
}

// Extract the body lines of `model X {` / `enum X {` (brace-depth aware).
function extractBlock(schema, kind, name) {
  const lines = schema.split("\n");
  const open = new RegExp(`^\\s*${kind}\\s+${name}\\s*{`);
  let depth = 0;
  let inside = false;
  const body = [];
  for (const line of lines) {
    if (!inside && open.test(line)) {
      inside = true;
      depth = 1;
      continue;
    }
    if (!inside) continue;
    depth += (line.match(/{/g) || []).length;
    depth -= (line.match(/}/g) || []).length;
    if (depth <= 0) return normalizeLines(body.join("\n"));
    body.push(line);
  }
  return null;
}

const socket = read(SOCKET_SCHEMA);
const be = read(BE_SCHEMA);
const errors = [];

for (const [kind, name] of [
  ["enum", "MessageType"],
  ["model", "Message"],
  ["model", "MessageReaction"],
]) {
  const a = extractBlock(socket, kind, name);
  const b = extractBlock(be, kind, name);
  if (!a) errors.push(`${kind} ${name} missing from socket schema`);
  if (!b) errors.push(`${kind} ${name} missing from BE schema`);
  if (a && b && a.join("\n") !== b.join("\n")) {
    errors.push(
      `${kind} ${name} DRIFT:\n` +
        `  socket:\n    ${a.join("\n    ")}\n` +
        `  be:\n    ${b.join("\n    ")}`,
    );
  }
}

if (errors.length) {
  console.error(
    "\n[schema-drift] socket mirror is OUT OF SYNC with social-network-system:\n",
  );
  for (const e of errors) console.error("  • " + e + "\n");
  console.error(
    "Fix: copy the changed model(s) from social-network-system/prisma/schema.prisma\n" +
      "into prisma/schema.prisma, then `npx prisma generate`.\n",
  );
  process.exit(1);
}

console.log("[schema-drift] OK — socket mirror matches social-network-system");
