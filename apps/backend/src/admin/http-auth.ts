import type { FastifyRequest } from "fastify";
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
