import { Router } from "express";

import { signupController } from "./auth.controller.ts";

const router = Router();

router.post("/signup", signupController);

export default router;