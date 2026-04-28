import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AdminAuthService, AuthErrorCode } from "./auth.js";
import { getBearerToken, requireAdminUser } from "./http-auth.js";

const emailSchema = z.string().email().max(320);
const passwordSchema = z.string().min(10).max(256);

const emailPayloadSchema = z.object({
  email: emailSchema
});

const loginPayloadSchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(256)
});

const passwordPayloadSchema = z.object({
  password: passwordSchema
});

export async function registerAdminAuthRoutes(
  server: FastifyInstance,
  authService: AdminAuthService,
  bootstrapAdminEmails: readonly string[]
): Promise<void> {
  server.get("/admin/bootstrap/status", async () => ({
    bootstrapAdminEmailsConfigured: bootstrapAdminEmails.length > 0
  }));

  server.post("/admin/auth/bootstrap", async (request, reply) => {
    const payload = emailPayloadSchema.safeParse(request.body);

    if (!payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await authService.bootstrapLogin(payload.data.email);

    if (!result.ok) {
      return reply.status(statusForAuthError(result.code)).send({ error: result.code });
    }

    return result.value;
  });

  server.post("/admin/auth/login", async (request, reply) => {
    const payload = loginPayloadSchema.safeParse(request.body);

    if (!payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await authService.login(payload.data.email, payload.data.password);

    if (!result.ok) {
      return reply.status(statusForAuthError(result.code)).send({ error: result.code });
    }

    return result.value;
  });

  server.get("/admin/auth/me", async (request, reply) => {
    const user = await requireAdminUser(request, authService);

    if (!user) {
      return reply.status(401).send({ error: "invalid_session" });
    }

    return { user };
  });

  server.post("/admin/auth/password", async (request, reply) => {
    const token = getBearerToken(request);

    if (!token) {
      return reply.status(401).send({ error: "invalid_session" });
    }

    const payload = passwordPayloadSchema.safeParse(request.body);

    if (!payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await authService.setPassword(token, payload.data.password);

    if (!result.ok) {
      return reply.status(401).send({ error: result.code });
    }

    return { user: result.user };
  });

  server.post("/admin/auth/logout", async (request) => {
    const token = getBearerToken(request);

    if (token) {
      await authService.logout(token);
    }

    return { ok: true };
  });
}

function statusForAuthError(code: AuthErrorCode): 401 | 403 {
  if (code === "bootstrap_email_not_allowed") {
    return 403;
  }

  return 401;
}
