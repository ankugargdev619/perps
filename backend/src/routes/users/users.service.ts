import { prisma } from "../../db/prisma.ts";
import type { CurrentUsersData } from "./users.schema.ts";

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

  async updateUserPreferences(userId: string, data: CurrentUsersData) {
    const updateData: Partial<CurrentUsersData> = {};
    if (data.name !== undefined) {
        updateData.name = data.name
    };
    if (data.email !== undefined) {
        updateData.email = data.email
    };

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
}

export const usersService = new UsersService();