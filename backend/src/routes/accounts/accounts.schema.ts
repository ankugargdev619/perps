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

export const accountWithdrawSchema = z.object({
  amount: z
    .string()
    .regex(
      /^\d{1,18}(\.\d{1,18})?$/,
      "Invalid decimal format only upto 18 digits before and after decimal are allowed"
    ),
});

export const ledgerQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  cursor: z.string().min(1).optional(),
});
