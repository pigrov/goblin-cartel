import type { FastifyReply, FastifyRequest } from "fastify";
import type { AdminAuthService, PublicAdminUser } from "./auth.js";

export function getBearerToken(request: FastifyRequest): string | null {
  const authorization = request.headers.authorization;

  if (!authorization?.startsWith("Bearer ")) {
    return null;
  }

  return authorization.slice("Bearer ".length).trim() || null;
}

export async function requireAdminUser(
  request: FastifyRequest,
  authService: AdminAuthService
): Promise<PublicAdminUser | null> {
  const token = getBearerToken(request);

  if (!token) {
    return null;
  }

  const result = await authService.getSessionUser(token);
  return result.ok ? result.user : null;
}

export async function requireReadyAdminUser(
  request: FastifyRequest,
  reply: FastifyReply,
  authService: AdminAuthService
): Promise<PublicAdminUser | null> {
  const user = await requireAdminUser(request, authService);

  if (!user) {
    reply.status(401).send({ error: "invalid_session" });
    return null;
  }

  if (user.mustSetPassword) {
    reply.status(403).send({ error: "password_setup_required" });
    return null;
  }

  return user;
}
