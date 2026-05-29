import { Router } from "express";
import { healthRouter } from "./health/health.routes.ts";
import { authRouter } from "./auth/auth.routes.ts";
import { accountsRouter } from "./accounts/accounts.routes.ts";
import { usersRouter } from "./users/users.routes.ts";
import { auth } from "../middlewares/auth.middleware.ts";
import { marketsRouter } from "./markets/markets.routes.ts";

export const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/accounts", auth, accountsRouter);
router.use("/users", usersRouter);
router.use("/markets", marketsRouter);

// TODO 
// auth routes etc.
