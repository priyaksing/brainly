import express, { Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env";
import { logger } from "./config/logger";
import router from "./routes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { globalLimiter } from "./middleware/rateLimiter";

export function createApp(): Express {
  const app = express();

  app.set("trust proxy", 1);

  app.use(helmet());
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use(pinoHttp({ logger }));
  app.use(globalLimiter);

  app.use(router);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}