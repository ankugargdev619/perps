import { PrismaClient } from "@prisma/client/extension";
import { env } from "../config/env.ts";


declare global {
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    datacourceUrrl: env.DATABASE_URL,
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "prod") globalThis.__prisma = prisma;

export async function connectPrisma() {
  await prisma.$connect();
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}


