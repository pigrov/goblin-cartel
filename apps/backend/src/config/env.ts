import { existsSync } from "node:fs";
import path from "node:path";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { parseBootstrapEmails } from "../security/bootstrap.js";

for (const envPath of [path.resolve(process.cwd(), ".env"), path.resolve(process.cwd(), "..", "..", ".env")]) {
  if (existsSync(envPath)) {
    loadDotenv({ path: envPath, override: false });
  }
}

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  BASE_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  APP_ASSET_STORAGE_DIR: z.string().min(1).default("storage/assets"),
  APP_CREDENTIALS_MASTER_KEY: z.string().min(32),
  APP_BOOTSTRAP_ADMIN_EMAILS: z.string().min(1)
});

export interface AppEnv {
  nodeEnv: "development" | "test" | "production";
  port: number;
  baseUrl: string;
  databaseUrl: string;
  assetStorageDir: string;
  credentialsMasterKey: string;
  bootstrapAdminEmails: string[];
}

export function loadEnv(source: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    throw new Error(`Invalid environment: ${parsed.error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
  }

  return {
    nodeEnv: parsed.data.NODE_ENV,
    port: parsed.data.PORT,
    baseUrl: parsed.data.BASE_URL,
    databaseUrl: parsed.data.DATABASE_URL,
    assetStorageDir: parsed.data.APP_ASSET_STORAGE_DIR,
    credentialsMasterKey: parsed.data.APP_CREDENTIALS_MASTER_KEY,
    bootstrapAdminEmails: parseBootstrapEmails(parsed.data.APP_BOOTSTRAP_ADMIN_EMAILS)
  };
}
