import { Router } from "express";
import { healthController } from "./health.controller.ts";

export const healthRouter = Router();

healthRouter.get("/", healthController);
