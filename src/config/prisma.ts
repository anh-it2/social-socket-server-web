import { PrismaClient } from "@prisma/client";

// One client for the whole process. Creating many leaks DB connections.
// This client talks to the SAME Postgres (`spbe`) that social-platform-be
// owns; this server only reads/writes rows, never migrates the schema.
export const prisma = new PrismaClient();
