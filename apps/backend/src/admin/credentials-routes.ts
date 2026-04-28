import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AdminAuthService } from "./auth.js";
import type { AdminCredentialService } from "./credentials.js";
import { requireReadyAdminUser } from "./http-auth.js";

const credentialNameSchema = z
  .string()
  .min(2)
  .max(80)
  .regex(/^[a-z0-9][a-z0-9._-]*$/u);

const credentialTypeSchema = z.enum(["api_key", "oauth", "smtp", "storage", "analytics", "push", "json", "secret"]);
const credentialEnvironmentSchema = z.enum(["production", "staging", "development"]);

const credentialPayloadSchema = z.object({
  name: credentialNameSchema,
  type: credentialTypeSchema,
  environment: credentialEnvironmentSchema.default("production"),
  value: z.string().min(1).max(20000)
});

export async function registerAdminCredentialRoutes(
  server: FastifyInstance,
  authService: AdminAuthService,
  credentialService: AdminCredentialService
): Promise<void> {
  server.get("/admin/credentials", async (request, reply) => {
    const user = await requireReadyAdminUser(request, reply, authService);

    if (!user) {
      return undefined;
    }

    const credentials = await credentialService.listCredentials(user.id);
    return { credentials };
  });

  server.post("/admin/credentials", async (request, reply) => {
    const user = await requireReadyAdminUser(request, reply, authService);

    if (!user) {
      return undefined;
    }

    const payload = credentialPayloadSchema.safeParse(request.body);

    if (!payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const credential = await credentialService.upsertCredential(user.id, payload.data);
    return { credential };
  });
}
