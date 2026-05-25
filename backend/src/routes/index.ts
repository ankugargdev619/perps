import { Router } from "express";
import { healthRouter } from "./health/health.routes.ts";
import { authRouter } from "./auth/auth.routes.ts";

export const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);

// TODO 
// auth routes etc.
