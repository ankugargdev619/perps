import { Router } from "express";
import { healthRouter } from "./health/health.routes.js";

export const router = Router();

router.use("/health", healthRouter);

// TODO 
// auth routes etc.
