import { Router } from "express";

import { loginController, signupController, refreshTokenController, LogoutCOntroller } from "./auth.controller.ts";
import { validate } from "../../middlewares/validate.middleware.ts";
import { signupSchema, loginschema, refreshTokenSchema, LogoutSchema} from "./auth.schema.ts";

export const authRouter = Router();

authRouter.post("/signup", validate({ body: signupSchema }), signupController);

// Here we created endpoint for login and it is being put through validation and in the body of validation loginSchema is sent to be verified.
// Also, loginController is being passed here along with validation.
authRouter.post("/login", validate({body: loginschema}), loginController);

authRouter.post("/refresh-token",validate({ body: refreshTokenSchema }),refreshTokenController);

// logout
authRouter.post("/logout", validate({body: LogoutSchema}), LogoutCOntroller);
