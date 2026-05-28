import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 *  Middle function that : 
 *  - Intecepts the x-request-id for the incoming request 
 *  - Generate a new token if the token doesn't exist
 *  - Attach the token to the request body 
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incoming = req.header("x-request-id");
  const trimmed = incoming?.trim();
  const id = trimmed ? trimmed : randomUUID();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}
