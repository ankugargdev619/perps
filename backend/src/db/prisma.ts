import { PrismaClient } from "../generated/prisma/client.ts";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.ts";


declare global {
  var __prisma: PrismaClient | undefined;
}

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (env.NODE_ENV !== "prod") globalThis.__prisma = prisma;

export async function connectPrisma() {
  await prisma.$connect();
}

export async function disconnectPrisma() {
  await prisma.$disconnect();
}

