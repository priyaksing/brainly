import { env } from "./config/env";
import { logger } from "./config/logger";
import { connectDB, disconnectDB } from "./db/connection";
import { createApp } from "./app";

async function bootstrap() {
  await connectDB();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT, env: env.NODE_ENV }, "Server listening");
  });

  const shutdown = async (signal: string) => {
    logger.info({ signal }, "Shutting down...");
    server.close(async () => {
      await disconnectDB();
      logger.info("Shutdown complete");
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("Forced shutdown after 10s");
      process.exit(1);
    }, 10_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.fatal({ err }, "Failed to start");
  process.exit(1);
});
