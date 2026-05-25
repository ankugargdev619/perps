import { Router } from "express";

import { signupController } from "./auth.controller.ts";
import { validate } from "../../middlewares/validate.middleware.ts";
import { signupSchema } from "./auth.schema.ts";

export const authRouter = Router();

authRouter.post("/signup", validate({ body: signupSchema }), signupController);
