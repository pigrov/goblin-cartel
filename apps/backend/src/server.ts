import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { createAdminAuthService, type AdminAuthService } from "./admin/auth.js";
import { DrizzleAdminAuthStore } from "./admin/auth-store.js";
import { registerAdminAuthRoutes } from "./admin/routes.js";
import type { AppEnv } from "./config/env.js";
import { createDb } from "./db/client.js";

export interface ServerDependencies {
  adminAuthService?: AdminAuthService;
}

export async function buildServer(env: AppEnv, dependencies: ServerDependencies = {}): Promise<FastifyInstance> {
  const server = Fastify({
    logger: env.nodeEnv !== "test"
  });

  await server.register(cors, {
    origin: env.nodeEnv === "production" ? env.baseUrl : true
  });

  server.get("/health", async () => ({
    status: "ok",
    service: "goblin-cartel-backend",
    environment: env.nodeEnv,
    time: new Date().toISOString()
  }));

  const adminAuthService =
    dependencies.adminAuthService ??
    createAdminAuthService({
      store: new DrizzleAdminAuthStore(createDb(env)),
      bootstrapAdminEmails: env.bootstrapAdminEmails
    });

  await registerAdminAuthRoutes(server, adminAuthService, env.bootstrapAdminEmails);

  return server;
}
