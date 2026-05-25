import { z } from "zod";

export const accountParamSchema = z.object({
  id: z.string().min(1, "Account id is required"),
});
