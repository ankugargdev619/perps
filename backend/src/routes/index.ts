import { Router } from "express";
import { healthRouter } from "./health/health.routes.ts";

export const router = Router();

router.use("/health", healthRouter);

// TODO 
// auth routes etc.
