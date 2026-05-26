import { Request, Response } from "express";
import { usersService } from "./users.service.ts";
import {
  getUserResponseSchema,
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
  const updatedUser = await usersService.updateUserPreferences(userId, payload);

  const response = updateUserResponseSchema.parse(updatedUser);
  return res.status(200).json(response);
}
