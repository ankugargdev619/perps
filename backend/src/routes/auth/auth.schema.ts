import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  password: z.string().min(6),
});

// This is schema which you've defined for login.

export type SignupInput = z.infer<typeof signupSchema>;

export const loginschema = z.object({
  email : z.string().email(),
  password : z.string().min(6),
})

export type LoginInput = z.infer<typeof loginschema>;

// Schema for Refresh Token

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

// Schema for Logout 

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export type LogoutInput = z.infer<typeof LogoutSchema>;