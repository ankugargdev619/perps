import request from "supertest";
import { createApp } from "../../app";

describe("GET /api/health", () => {
  it("returns 200 and healthy status", async () => {
    const app = createApp();

    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);

    expect(res.body).toEqual({
      status: "healthy",
    });
  });
}); 
