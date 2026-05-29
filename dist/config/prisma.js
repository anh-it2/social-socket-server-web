"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
// One client for the whole process. Creating many leaks DB connections.
// This client talks to the SAME Postgres (`spbe`) that social-platform-be
// owns; this server only reads/writes rows, never migrates the schema.
exports.prisma = new client_1.PrismaClient();
