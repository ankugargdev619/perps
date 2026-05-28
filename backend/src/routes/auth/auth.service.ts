import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.ts";
import { prisma } from "../../db/prisma.ts";
import { SignupInput, LoginInput } from "./auth.schema.ts";

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
        email: user.email,
        role: user.role
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

  // Whole signup function ends here and the next login function is written inside AuthService class which we've created.

  // Login Function 

  async login(data: LoginInput) {

    const { email, password } = data;

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("Invalid email")
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new Error("Invalid Password")
    }


    // Login Function has its own Jwt creation {seperate from signup Function}
    // Generate JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
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

  // After creation of this signup Function you must create a Controller function which will hande user's request

}





export const authService = new AuthService();




