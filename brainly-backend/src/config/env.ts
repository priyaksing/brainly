import * as dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    DB_CONNECTION: z.string().min(1, "DB_CONNECTION is required"),
    JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 chars"),
    FRONTEND_URL: z.string().url().default("http://localhost:5173"),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}

export const env = parsed.data;