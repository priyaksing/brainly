import { Request, Response } from "express";
import mongoose from "mongoose";

export const liveness = (req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
};

export const readiness = (req: Request, res: Response) => {
  const dbReady = mongoose.connection.readyState === 1;

  if (!dbReady) {
    res.status(503).json({ status: "not ready", db: "disconnected" });
    return;
  }

  res.status(200).json({ status: "ready", db: "connected" });
};
