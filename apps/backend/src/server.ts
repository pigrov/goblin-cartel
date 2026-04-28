import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppEnv } from "./config/env.js";

export async function buildServer(env: AppEnv): Promise<FastifyInstance> {
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

  server.get("/admin/bootstrap/status", async () => ({
    bootstrapAdminEmailsConfigured: env.bootstrapAdminEmails.length > 0
  }));

  return server;
}
