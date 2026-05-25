import { Router } from "express";

import { signupController } from "./auth.controller.ts";

export const authRouter = Router();

authRouter.post("/signup", signupController);
