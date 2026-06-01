import { NextFunction, Request, Response, RequestHandler } from "express";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { env } from "../config/env.ts";

type AuthUser =
  {
    id: string;
    email: string;
    role: string;
  }

const JWT_SECRET = env.JWT_SECRET;

/**
  * Helper function which extracts the token from the request object  
  */
function getBearerToken(req: Request): string | null {
  const h = req.header("authorization");
  if (!h) return null;
  const [scheme, token] = h.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}


/**
 * Auth middleware function and performs below :
  * - Read a bearer token
  * - Verify the JWT token
  * - Attach a user object to the request
  * - Return 401 for any missing or invalid data
  */
export const auth: RequestHandler = (req: Request, res: Response, next: NextFunction) => {
  const token = getBearerToken(req);
  if (!token) return res.status(401).json({ message: "Missing Authorization header" });

  try {
    // Decode the JWT token and verify 
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload | string;
    if (typeof decoded === "string") return res.status(401).json({ message: "Invalid token" });

    const userId = decoded.sub ?? decoded.userId ?? decoded.id;
    if (typeof userId !== "string" || userId.length === 0) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    // Create user object 
    const user: AuthUser = {
      id: userId,
      email: typeof decoded.email === "string" ? decoded.email : '',
      role: typeof decoded.role === "string" ? decoded.role : ''
    };

    // Attach user object to the request 
    req.user = user;

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
