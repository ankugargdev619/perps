import { Request, Response } from "express";

import { signupSchema, loginschema } from "./auth.schema.ts";
import { authService } from "./auth.service.ts";
import { success } from "zod";


export const signupController = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate body
    const validatedData = signupSchema.parse(req.body);

    // Call service
    const result = await authService.signup(validatedData);

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      data: result,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

// Just like SignupController you've to create LoginController too

export const loginController = async(
  req: Request,
  res: Response
) =>{
  try{
    const validatedData = loginschema.parse(req.body);

    const result = await authService.login(validatedData);

    return res.status(200).json({
      success: true,
      message: "User got logged in successfully",
      data: result,

    });

  }catch(error: any){
    return res.status(401).json({
      success: false,
      message: error.message,
    });
  }
}


