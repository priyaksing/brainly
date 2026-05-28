import { env } from "../config/env";
import { logger } from "../config/logger";
import mongoose from "mongoose";

export async function connectDB() {
  mongoose.connection.on("connected", () => {
    logger.info("DB Connected");
  });
  mongoose.connection.on("error", (err) => {
    logger.error({ err }, "DB Connection error");
  });
  mongoose.connection.on("disconnected", () => {
    logger.warn("DB Disconnected");
  });

  await mongoose.connect(env.DB_CONNECTION);
}

export async function disconnectDB() {
  await mongoose.disconnect();
}
