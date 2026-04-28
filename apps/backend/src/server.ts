import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { createAdminAuthService, type AdminAuthService } from "./admin/auth.js";
import { DrizzleAdminAuthStore } from "./admin/auth-store.js";
import { createContentService, type ContentService } from "./admin/content.js";
import { registerContentRoutes } from "./admin/content-routes.js";
import { DrizzleContentStore } from "./admin/content-store.js";
import { createAdminCredentialService, type AdminCredentialService } from "./admin/credentials.js";
import { registerAdminCredentialRoutes } from "./admin/credentials-routes.js";
import { DrizzleAdminCredentialStore } from "./admin/credentials-store.js";
import { registerAdminAuthRoutes } from "./admin/routes.js";
import type { AppEnv } from "./config/env.js";
import { createDb } from "./db/client.js";

export interface ServerDependencies {
  adminAuthService?: AdminAuthService;
  adminCredentialService?: AdminCredentialService;
  contentService?: ContentService;
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

  const db =
    dependencies.adminAuthService && dependencies.adminCredentialService && dependencies.contentService ? null : createDb(env);

  const adminAuthService =
    dependencies.adminAuthService ??
    createAdminAuthService({
      store: new DrizzleAdminAuthStore(db ?? createDb(env)),
      bootstrapAdminEmails: env.bootstrapAdminEmails
    });

  const adminCredentialService =
    dependencies.adminCredentialService ??
    createAdminCredentialService({
      store: new DrizzleAdminCredentialStore(db ?? createDb(env)),
      masterKey: env.credentialsMasterKey
    });

  const contentService =
    dependencies.contentService ??
    createContentService({
      store: new DrizzleContentStore(db ?? createDb(env))
    });

  await registerAdminAuthRoutes(server, adminAuthService, env.bootstrapAdminEmails);
  await registerAdminCredentialRoutes(server, adminAuthService, adminCredentialService);
  await registerContentRoutes(server, adminAuthService, contentService);

  return server;
}
