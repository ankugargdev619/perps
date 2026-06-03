import { Router } from "express";
import { currentUsersData, updateUserPreferences, createApiKey, listApiKeys, revokeApiKey} from "./users.controller.ts";

export const usersRouter = Router();

usersRouter.get("/me", currentUsersData);
usersRouter.patch("/me", updateUserPreferences);
usersRouter.post("/api-keys", createApiKey);
usersRouter.get("/api-keys", listApiKeys);
usersRouter.delete("/api-keys/:id", revokeApiKey);