import { prisma } from "../../db/prisma.ts";
import type { CreateApiKeyRequest, CurrentUsersData, UpdateUserRequest } from "./users.schema.ts";
import crypto from "crypto";

export class UsersService {
  async getUserById(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });
  }

  async updateUserPreferences(userId: string, data: UpdateUserRequest) {
    const updateData: Partial<CurrentUsersData> = {};
    if (data.name !== undefined) {
      updateData.name = data.name
    };
    if (data.email !== undefined) {
      updateData.email = data.email
    };

    if (Object.keys(updateData).length === 0) {
      throw new Error("No fields provided to update");
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    return user;
  }

  async createApiKey(userId: string, data: CreateApiKeyRequest) {
    const rawKey = `perps_${crypto.randomBytes(32).toString("hex")}`;
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        keyHash,
        label: data.label,
        scopes: data.scopes,
      },
      select: {
        id: true,
        label: true,
        scopes: true,
        createdAt: true,
      },
    });
    return {
      ...apiKey,
      apiKey: rawKey,
    };
  }

  async listApiKeys(userId: string) {
    return prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        label: true,
        scopes: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }
  
  async revokeApiKey(userId: string, apiKeyId: string) {
    const deleted = await prisma.apiKey.deleteMany({
      where: {
        id: apiKeyId,
        userId,
      },
    });
    return deleted.count > 0;
  }
}

export const usersService = new UsersService();




