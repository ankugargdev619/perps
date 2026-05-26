import { z } from "zod";

export const accountParamSchema = z.object({
  id: z.string().min(1, "Account id is required"),
});

export const accountDepositSchema = z.object({
  amount: z
    .string()
    .regex(
      /^\d{1,18}(\.\d{1,18})?$/,
      "Invalid decimal format only upto 18 digits before and after decimal are allowed"
    ),
});

