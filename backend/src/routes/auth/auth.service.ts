import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { prisma } from "../../db/prisma.ts";
import { SignupInput } from "./auth.schema.ts";

export const signupService = async (data: SignupInput) => {
  const { name, email, password } = data;

  // Check existing user
  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new Error("User already exists");
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
    },
  });

  // Generate JWT
  const token = jwt.sign(
    {
      userId: user.id,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "7d",
    }
  );

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  };
};