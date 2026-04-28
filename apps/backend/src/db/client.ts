import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import type { AppEnv } from "../config/env.js";
import * as schema from "./schema.js";

export function createDb(env: AppEnv) {
  const client = postgres(env.databaseUrl, {
    max: 10
  });

  return drizzle(client, { schema });
}
