import { createApp } from "./app.ts";
import { connectRedis, disconnectRedis } from "./cache/redis.ts";
import { env } from "./config/env.ts";
import { connectPrisma, disconnectPrisma } from "./db/prisma.ts";

const PORT = env.PORT;
const HOST = env.HOST;

const app = createApp();

async function start() {
  await connectPrisma();
  await connectRedis();

  const server = app.listen(PORT, HOST, () => {
    console.log(`Backend running on port ${PORT}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down...`);
    server.close(async () => {
      await disconnectRedis();
      await disconnectPrisma();
      process.exit(0);
    });

  };
  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

start().catch((err) => {
  console.log("Failed to start server:", err);
  process.exit(1);
});
