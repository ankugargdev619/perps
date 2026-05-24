import express from "express";
import cors from "cors";
import { router } from "./routes/index.ts";
import authRouter from "./routes/auth/auth.routes.ts"

const app = express();

export function createApp() {
  // Use middleware for json and cors 
  app.use(cors({
    origin: ["http://localhost:3000"],  //Frontend url
    credentials: true
  }));

  app.use(express.json());

  app.use("/api", router);

  app.use("/api/auth", authRouter);
  return app;
}
