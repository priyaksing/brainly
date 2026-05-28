import pino from "pino";
import { env } from "./env";

export const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV != "production"
      ? {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:HH:MM:ss" },
        }
      : undefined,
  redact: {
    paths: ["req.headers.authorization", "*.password", "*.token"],
    remove: true,
  },
});
