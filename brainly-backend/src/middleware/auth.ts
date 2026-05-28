import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { env } from "../config/env";

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers["authorization"];

  if (!token) {
    res.status(401).json({ message: "Authorization header missing" });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (!decoded || typeof decoded === "string" || !decoded.id) {
      res.status(401).json({ message: "Invalid token payload" });
      return;
    }
    req.userId = decoded.id as string;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
