import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(3),
  email: z.email(),
  password: z.string().min(6),
});

export type SignupInput = z.infer<typeof signupSchema>;