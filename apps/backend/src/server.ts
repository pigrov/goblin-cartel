import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { createAdminAuthService, type AdminAuthService } from "./admin/auth.js";
import { DrizzleAdminAuthStore } from "./admin/auth-store.js";
import { registerAssetRoutes } from "./admin/asset-routes.js";
import { createContentService, type ContentService } from "./admin/content.js";
import { registerContentRoutes } from "./admin/content-routes.js";
import { DrizzleContentStore } from "./admin/content-store.js";
import { createAdminCredentialService, type AdminCredentialService } from "./admin/credentials.js";
import { registerAdminCredentialRoutes } from "./admin/credentials-routes.js";
import { DrizzleAdminCredentialStore } from "./admin/credentials-store.js";
import { registerAdminAuthRoutes } from "./admin/routes.js";
import type { AppEnv } from "./config/env.js";
import { createDb } from "./db/client.js";
import { createPlayerSaveService, type PlayerSaveService } from "./player/player-save.js";
import { registerPlayerSaveRoutes } from "./player/player-save-routes.js";
import { DrizzlePlayerSaveStore } from "./player/player-save-store.js";
import { createVkIdentityVerifier } from "./player/vk-identity-verifier.js";

export interface ServerDependencies {
  adminAuthService?: AdminAuthService;
  adminCredentialService?: AdminCredentialService;
  contentService?: ContentService;
  playerSaveService?: PlayerSaveService;
}

const nativeAppCorsOrigins = ["https://localhost", "capacitor://localhost", "ionic://localhost"];
const requestBodyLimitBytes = 10 * 1024 * 1024;

export async function buildServer(env: AppEnv, dependencies: ServerDependencies = {}): Promise<FastifyInstance> {
  const server = Fastify({
    bodyLimit: requestBodyLimitBytes,
    logger: env.nodeEnv !== "test"
  });

  await server.register(cors, {
    origin: createCorsOrigin(env)
  });

  server.get("/health", async () => ({
    status: "ok",
    service: "goblin-cartel-backend",
    environment: env.nodeEnv,
    time: new Date().toISOString()
  }));

  const db =
    dependencies.adminAuthService &&
    dependencies.adminCredentialService &&
    dependencies.contentService &&
    dependencies.playerSaveService
      ? null
      : createDb(env);

  const adminCredentialStore = new DrizzleAdminCredentialStore(db ?? createDb(env));

  const adminAuthService =
    dependencies.adminAuthService ??
    createAdminAuthService({
      store: new DrizzleAdminAuthStore(db ?? createDb(env)),
      bootstrapAdminEmails: env.bootstrapAdminEmails
    });

  const adminCredentialService =
    dependencies.adminCredentialService ??
    createAdminCredentialService({
      store: adminCredentialStore,
      masterKey: env.credentialsMasterKey
    });

  const contentService =
    dependencies.contentService ??
    createContentService({
      store: new DrizzleContentStore(db ?? createDb(env))
    });

  const playerSaveService =
    dependencies.playerSaveService ??
    createPlayerSaveService({
      identityVerifier: createVkIdentityVerifier({
        credentialStore: adminCredentialStore,
        masterKey: env.credentialsMasterKey
      }),
      store: new DrizzlePlayerSaveStore(db ?? createDb(env))
    });

  await registerAdminAuthRoutes(server, adminAuthService, env.bootstrapAdminEmails);
  await registerAdminCredentialRoutes(server, adminAuthService, adminCredentialService);
  await registerAssetRoutes(server, adminAuthService, { assetStorageDir: env.assetStorageDir });
  await registerContentRoutes(server, adminAuthService, contentService);
  await registerPlayerSaveRoutes(server, playerSaveService);

  return server;
}

export function createCorsOrigin(env: AppEnv): true | string[] {
  if (env.nodeEnv !== "production") {
    return true;
  }

  return Array.from(new Set([env.baseUrl, ...nativeAppCorsOrigins]));
}
