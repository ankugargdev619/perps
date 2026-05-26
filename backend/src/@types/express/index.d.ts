declare global {
  namespace Express {
    interface Request {
      validated?: { body?: unknown; query?: unknown; params?: unknown };
      requestId?: string;
      user?: {
        id: string;
        email: string;
      }
    }
  }
}

export { };
