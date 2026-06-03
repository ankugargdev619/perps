import bcrypt from "bcryptjs";
import jwt, { Jwt, JwtPayload } from "jsonwebtoken";
import { env } from "../../config/env.ts";
import { prisma } from "../../db/prisma.ts";
import crypto from "crypto";
import { SignupInput, LoginInput, RefreshTokenInput, LogoutInput  } from "./auth.schema.ts";
import { hex } from "zod";


const JWT_SECRET = env.JWT_SECRET;
const DEFAULT_ASSET = env.DEFAULT_ASSET;
const ACCESS_TOKEN_VALIDITY = '15m';
const REFRESH_TOKEN_VALIDITY = '7d';
const ONE_HOUR_IN_MS = 60 * 60 * 1000;

function hashToken(token: string){
return crypto.createHash("sha256").update(token).digest("hex");
}

function getRefreshTokenExpiry(){
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

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
        expiresIn: REFRESH_TOKEN_VALIDITY,
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
    const accesstoken = this.createAccessToken(
      {
        id: user.id,
        email: user.email,
        role: user.role
      },
      
    );

    const refrehToken = await this.createRefreshToken(user.id);

    return {
      accesstoken,
      refrehToken,
      user: {
        
        name: user.name,
        email: user.email,
      },
    };
  }

  // After creation of this signup Function you must create a Controller function which will hande user's request

//Helper Methods created for Refresh Tokens

private createAccessToken(user : {id: string, email: string, role: string}){

  return jwt.sign({
    userId : user.id,
    email : user.email,
    role : user.role
  },
  JWT_SECRET,
  {
    expiresIn : ACCESS_TOKEN_VALIDITY,
  }
);
}

private async createRefreshToken(userId: string) {
  const refreshToken = crypto.randomBytes(64).toString("hex");

  await prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(refreshToken),
      userId,
      expiresAt: getRefreshTokenExpiry(),
    },
  });

  return refreshToken;
}
  

// Refresh Token Service Method

async refreshToken(data: RefreshTokenInput) {
  const { refreshToken } = data;

  const tokenHash = hashToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,
    },
    include: {
      user: true,
    },
  });

  if (!storedToken) {
    throw new Error("Invalid refresh token");
  }

  if (storedToken.revokedAt) {
    throw new Error("Refresh token has been revoked");
  }

  if (storedToken.expiresAt < new Date()) {
    throw new Error("Refresh token has expired");
  }

  const accessToken = this.createAccessToken({
    id: storedToken.user.id,
    email: storedToken.user.email,
    role: storedToken.user.role,
  });

  const timeLeft = storedToken.expiresAt.getTime() - Date.now();

  if (timeLeft < ONE_HOUR_IN_MS) {
    await prisma.refreshToken.update({
      where: {
        id: storedToken.id,
      },
      data: {
        revokedAt: new Date(),
      },
    });

    const newRefreshToken = await this.createRefreshToken(storedToken.user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  return {
    accessToken,
    refreshToken,
  };
}


// Logout Service Method

// It fetches the refresh Token and based on that it either logs user out or let user in.

async logout(data: LogoutInput) {
  
  const {refreshToken} = data;

  const tokenHash = hashToken(refreshToken);

  const storedToken = await prisma.refreshToken.findUnique({
    where: {
      tokenHash,

    },
  });

  if (!storedToken) {
    throw new Error("Invalid refresh token");
  }

  if (storedToken.revokedAt) {
    return {
      loggedOut: true,
    };
  }

  await prisma.refreshToken.update({
    where:{
      id: storedToken.id,
    },
    data:{
      revokedAt: new Date(),
    },
  });

  return{
    loggedOut: true,
  }

}

}





export const authService = new AuthService();
