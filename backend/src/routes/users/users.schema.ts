import { z } from "zod";

export const getUserResponseSchema = z.object({
  id: z.string().cuid(),
  name: z.string(),
  email: z.string().email(),
  createdAt: z.date(),
})

export type CurrentUsersData = z.infer<typeof getUserResponseSchema>;

export const updateUserRequestSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
}).strict(); // Strict means no extra fields allowed

export type UpdateUserRequest = z.infer<typeof updateUserRequestSchema>;

// Schema for PATCH /users/me response
export const updateUserResponseSchema = getUserResponseSchema;

export type UpdateUserResponse = z.infer<typeof updateUserResponseSchema>;

export const createApiKeyRequestSchema = z.object({
  label: z.string().min(1).max(100),
  scopes: z.array(z.enum(["read", "write"])).min(1).default(["read"]),
}).strict();

export type CreateApiKeyRequest = z.infer<typeof createApiKeyRequestSchema>;

export const apiKeyResponseSchema = z.object({
  id: z.string().cuid(),
  label: z.string(),
  scopes: z.array(z.string()),
  createdAt: z.date(),
});

export const createApiKeyResponseSchema = apiKeyResponseSchema.extend({
  apiKey: z.string(),
});

export const listApiKeysResponseSchema = z.array(apiKeyResponseSchema);

export const revokeApiKeyParamsSchema = z.object({
  id: z.string().cuid(),
});
