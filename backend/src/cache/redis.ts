import { createClient, type RedisClientType } from "redis";
import { env } from "../config/env.ts";


export const redis: RedisClientType = createClient({
  url: env.REDIS_URL,
});

redis.on("error", (err) => {
  console.error('Redis client error:', err);
});


export async function connectRedis() {
  if (redis.isOpen) return;
  await redis.connect();
}

export async function disconnectRedis() {
  if (!redis.isOpen) return;
  await redis.quit();
}
