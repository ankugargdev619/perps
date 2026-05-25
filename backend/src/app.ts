import express from "express";
import cors from "cors";
import { router } from "./routes/index.ts";
import { requestIdMiddleware } from "./middlewares/requestId.middleware.ts";
import { errorMiddleware } from "./middlewares/error.middleware.ts";

const app = express();

export function createApp() {
  // Use middleware for json and cors 
  app.use(cors({
    origin: ["http://localhost:3000"],  //Frontend url
    credentials: true
  }));

  // add all the JSON 
  app.use(express.json());
  app.use(requestIdMiddleware);

  app.use("/api", router);

  // Handle all the error throen by the app
  app.use(errorMiddleware);
  return app;
}
