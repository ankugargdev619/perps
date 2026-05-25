import { Router } from "express";
import { healthController, healthReadiness } from "./health.controller.ts";

export const healthRouter = Router();

healthRouter.get("/", healthController);
healthRouter.get("/ready", healthReadiness);
