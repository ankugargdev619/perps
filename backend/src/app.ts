import express from "express";
import cors from "cors";

const app = express();

export function createApp() {
  // Use middleware for json and cors 
  app.use(cors({
    origin: ["http://localhost:3000"],  //Frontend url
    credentials: true
  }));

  app.use(express.json());

  app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy" })
  });

  return app;
}
