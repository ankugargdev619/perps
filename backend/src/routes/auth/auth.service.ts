import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.ts";
import { prisma } from "../../db/prisma.ts";
import { SignupInput } from "./auth.schema.ts";

const JWT_SECRET = env.JWT_SECRET;
const DEFAULT_ASSET = env.DEFAULT_ASSET;
const TOKEN_VALIDITY = '7d';

export class AuthService {

  async signup(data: SignupInput) {

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


    // Start the transaction
    const user = await prisma.$transaction(async (tx) => {
      // Create user
      const userData = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
        },
      });

      // Initialize user account
      await tx.account.upsert({
        where: {
          userId_collateralAsset: { userId: userData.id, collateralAsset: DEFAULT_ASSET },
        },
        create: {
          userId: userData.id,
          collateralAsset: DEFAULT_ASSET,
          balance: 0,
          lockedMargin: 0,
        },
        update: {}
      })

      return userData;
    })



    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email
      },
      JWT_SECRET,
      {
        expiresIn: TOKEN_VALIDITY,
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
  }
}

export const authService = new AuthService();
