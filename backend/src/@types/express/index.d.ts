declare global {
  namespace Express {
    interface Request {
      validated?: { body?: any; query?: any; params?: any };
      requestId?: string;
      user?: {
        id: string;
        email: string;
        role: string;
      }
    }
  }
}

export { };
