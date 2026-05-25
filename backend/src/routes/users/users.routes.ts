import { Router } from "express";
import { currentUsersData, updateUserPreferences } from "./users.controller.ts";

export const usersRouter = Router();

usersRouter.get("/me", currentUsersData);
usersRouter.patch("/me", updateUserPreferences);