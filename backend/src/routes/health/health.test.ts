import request from "supertest";
import { createApp } from "../../app.ts";
import { connectPrisma, disconnectPrisma } from "../../db/prisma.ts";
import { connectRedis, disconnectRedis } from "../../cache/redis.ts";

describe("Health Check", () => {
  const app = createApp();

  beforeAll(async () => {
    await connectPrisma();
    await connectRedis();
  });

  afterAll(async () => {
    await disconnectPrisma();
    await disconnectRedis();
  });

  it("GET /api/health returns 200", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "healthy" });
  });

  it("GET api/health/ready returns 200", async () => {
    const res = await request(app).get("/api/health/ready");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ready" });
  });
});
