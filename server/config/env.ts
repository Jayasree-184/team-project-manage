import { randomBytes } from "node:crypto";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_ISSUER: z.string().default("team-project-manager"),
  JWT_AUDIENCE: z.string().default("team-project-manager-web"),
  JWT_EXPIRES_IN: z.string().default("2h"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CLIENT_ORIGIN: z.string().default("http://localhost:3000"),
});

export function resolveJwtSecret(nodeEnv: string | undefined, configuredSecret: string | undefined) {
  if (configuredSecret) return configuredSecret;
  if (nodeEnv === "production") throw new Error("JWT_SECRET is required in production.");
  return randomBytes(32).toString("hex");
}

const rawEnv = {
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: resolveJwtSecret(process.env.NODE_ENV, process.env.JWT_SECRET),
  JWT_ISSUER: process.env.JWT_ISSUER,
  JWT_AUDIENCE: process.env.JWT_AUDIENCE,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  NODE_ENV: process.env.NODE_ENV,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN,
};

const parsed = envSchema.safeParse(rawEnv);
if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const ENV = parsed.data;
