import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodTypeAny } from "zod/v3";

type Schemas = { body?: ZodTypeAny; query?: ZodTypeAny; params?: ZodTypeAny };

/**
 * Accept the expected schema and validate below : 
 * - body schema 
 * - query parameters 
 * - path parameters
 */
export function validate(s: Schemas): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const validated: {
      body?: unknown;
      query?: unknown;
      params?: unknown
    } = {};

    // Check the validity of path parameters
    const params = s.params?.safeParse(req.params);
    if (params && !params.success)
      return res.status(400).json({ message: "Invalid params", source: "params", issues: params.error.issues });

    // Check the validity of the query parameter
    const query = s.query?.safeParse(req.query);
    if (query && !query.success)
      return res.status(400).json({ message: "Invalid query", source: "query", issues: query.error.issues });

    // Check the validity of the body
    const body = s.body?.safeParse(req.body);
    if (body && !body.success)
      return res.status(400).json({ message: "Inavlid body", source: "body", issues: body.error.issues });

    if (params) validated.params = params.data;
    if (query) validated.query = query.data;
    if (body) validated.body = body.data;

    (req as Request & { validated: typeof validated }).validated = validated;
    next();
  }
}
