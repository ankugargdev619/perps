import { Request, Response } from "express";

import { signupSchema } from "./auth.schema.ts";
import { signupService } from "./auth.service.ts";

export const signupController = async (
  req: Request,
  res: Response
) => {
  try {
    // Validate body
    const validatedData = signupSchema.parse(req.body);

    // Call service
    const result = await signupService(validatedData);

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