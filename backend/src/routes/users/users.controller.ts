import { Request, Response } from "express";
import { usersService } from "./users.service.ts";
import {
  createApiKeyRequestSchema,
  createApiKeyResponseSchema,
  getUserResponseSchema,
  listApiKeysResponseSchema,
  revokeApiKeyParamsSchema,
  updateUserRequestSchema,
  updateUserResponseSchema,
} from "./users.schema.ts";


export async function currentUsersData(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = await usersService.getUserById(userId);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const response = getUserResponseSchema.parse(user);
  return res.status(200).json(response);
}

export async function updateUserPreferences(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const payload = updateUserRequestSchema.parse(req.body);
  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ message: "At least one field must be provided" });
  }

  const updatedUser = await usersService.updateUserPreferences(userId, payload);

  const response = updateUserResponseSchema.parse(updatedUser);
  return res.status(200).json(response);
}


export async function createApiKey(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const payload = createApiKeyRequestSchema.parse(req.body);
  const apiKey = await usersService.createApiKey(userId, payload);
  const response = createApiKeyResponseSchema.parse(apiKey);
  return res.status(201).json(response);
}

export async function listApiKeys(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const apiKeys = await usersService.listApiKeys(userId);
  const response = listApiKeysResponseSchema.parse(apiKeys);
  return res.status(200).json(response);
}

export async function revokeApiKey(req: Request, res: Response) {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const params = revokeApiKeyParamsSchema.parse(req.params);
  const revoked = await usersService.revokeApiKey(userId, params.id);
  if (!revoked) {
    return res.status(404).json({ message: "API key not found" });
  }
  return res.status(204).send();
}