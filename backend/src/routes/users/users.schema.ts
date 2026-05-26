import { z } from "zod";

export const getUserResponseSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.string().datetime(),
})

export type CurrentUsersData = z.infer<typeof getUserResponseSchema>;

export const updateUserRequestSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
}).strict(); // Strict means no extra fields allowed

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

// Schema for PATCH /users/me response
export const updateUserResponseSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  email: z.string().email(),
  updatedAt: z.date(),
});

export type UpdateUserResponse = z.infer<typeof updateUserResponseSchema>;
