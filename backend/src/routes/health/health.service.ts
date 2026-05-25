import { redis } from "../../cache/redis.ts";
import { prisma } from "../../db/prisma.ts";

const QUERY_RAW = `SELECT 1`;

export class HealthService {
  async checkDbConnection(): Promise<void> {
    await prisma.$queryRawUnsafe(QUERY_RAW);
  }

  async checkRedisConnection(): Promise<void> {
    if (!redis.isOpen) throw new Error("redis_not_open");
    await redis.ping();
  }

  async checkReadiness(): Promise<void> {
    await Promise.all([this.checkDbConnection(), this.checkRedisConnection()]);
  }
}

export const healthService = new HealthService();
