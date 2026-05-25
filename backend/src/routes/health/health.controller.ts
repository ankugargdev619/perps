import type { Request, Response } from "express";
import { healthService } from "./health.service.ts";

export function healthController(_req: Request, res: Response) {
  res.status(200).json({ status: "healthy" });
}

export async function healthReadiness(_req: Request, res: Response) {
  // Check connection readiness 
  try {
    await healthService.checkReadiness();
    res.status(200).json({ status: "ready" })
  } catch {
    res.status(503).json({ status: "not_ready" })
  }
}
