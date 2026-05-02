import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AdminAuthService } from "./auth.js";
import type { ContentService } from "./content.js";
import { requireReadyAdminUser } from "./http-auth.js";

const versionPayloadSchema = z.object({
  version: z.string().min(1).max(40).regex(/^[a-zA-Z0-9._-]+$/u),
  notes: z.string().max(1000).optional()
});

const contentPayloadSchema = z.object({
  content: z.unknown()
});

const contentEntityParamsSchema = z.object({
  id: z.string().uuid(),
  entityType: z.enum(["blockType", "bossCard", "builtMineType", "elevator", "goblin", "goblinHut", "mineTemplate", "rewardChestType"]),
  entityId: z.string().min(1)
});

const contentEntityPayloadSchema = z.object({
  entity: z.unknown(),
  localization: z.record(z.string().min(1), z.string().min(1)).optional()
});

export async function registerContentRoutes(
  server: FastifyInstance,
  authService: AdminAuthService,
  contentService: ContentService
): Promise<void> {
  server.get("/content/current", async (_request, reply) => {
    const current = await contentService.getCurrentPublishedContent();

    if (!current) {
      return reply.status(404).send({ error: "no_published_content" });
    }

    return current;
  });

  server.get("/admin/content/versions", async (request, reply) => {
    const user = await requireReadyAdminUser(request, reply, authService);

    if (!user) {
      return undefined;
    }

    const versions = await contentService.listVersions(user.id);
    return { versions };
  });

  server.post("/admin/content/versions", async (request, reply) => {
    const user = await requireReadyAdminUser(request, reply, authService);

    if (!user) {
      return undefined;
    }

    const payload = versionPayloadSchema.safeParse(request.body);

    if (!payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const detail = await contentService.createVersion(user.id, payload.data);
    return reply.status(201).send(detail);
  });

  server.get("/admin/content/versions/:id", async (request, reply) => {
    const user = await requireReadyAdminUser(request, reply, authService);

    if (!user) {
      return undefined;
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const detail = await contentService.getVersion(user.id, params.data.id);

    if (!detail) {
      return reply.status(404).send({ error: "content_version_not_found" });
    }

    return detail;
  });

  server.put("/admin/content/versions/:id/content", async (request, reply) => {
    const user = await requireReadyAdminUser(request, reply, authService);

    if (!user) {
      return undefined;
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);
    const payload = contentPayloadSchema.safeParse(request.body);

    if (!params.success || !payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await contentService.replaceContent(user.id, params.data.id, payload.data.content);

    if (!result) {
      return reply.status(404).send({ error: "content_version_not_found" });
    }

    if ("error" in result) {
      const status = result.error === "version_not_editable" ? 409 : 400;
      return reply.status(status).send(result);
    }

    return result;
  });

  server.put("/admin/content/versions/:id/entities/:entityType/:entityId", async (request, reply) => {
    const user = await requireReadyAdminUser(request, reply, authService);

    if (!user) {
      return undefined;
    }

    const params = contentEntityParamsSchema.safeParse(request.params);
    const payload = contentEntityPayloadSchema.safeParse(request.body);

    if (!params.success || !payload.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await contentService.updateEntity(user.id, params.data.id, {
      entity: payload.data.entity,
      entityId: params.data.entityId,
      entityType: params.data.entityType,
      localization: payload.data.localization
    });

    if (!result) {
      return reply.status(404).send({ error: "content_version_not_found" });
    }

    if ("error" in result) {
      const status = result.error === "version_not_editable" ? 409 : 400;
      return reply.status(status).send(result);
    }

    return result;
  });

  server.post("/admin/content/versions/:id/validate", async (request, reply) => {
    const user = await requireReadyAdminUser(request, reply, authService);

    if (!user) {
      return undefined;
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await contentService.validateVersion(user.id, params.data.id);

    if (!result) {
      return reply.status(404).send({ error: "content_version_not_found" });
    }

    if ("error" in result) {
      const status = result.error === "version_not_editable" ? 409 : 400;
      return reply.status(status).send(result);
    }

    return result;
  });

  server.post("/admin/content/versions/:id/publish", async (request, reply) => {
    const user = await requireReadyAdminUser(request, reply, authService);

    if (!user) {
      return undefined;
    }

    const params = z.object({ id: z.string().uuid() }).safeParse(request.params);

    if (!params.success) {
      return reply.status(400).send({ error: "invalid_payload" });
    }

    const result = await contentService.publishVersion(user.id, params.data.id);

    if (!result) {
      return reply.status(404).send({ error: "content_version_not_found" });
    }

    if ("error" in result) {
      const status = result.error === "version_not_editable" ? 409 : 400;
      return reply.status(status).send(result);
    }

    if (!result.validation.ok) {
      return reply.status(400).send(result);
    }

    return result;
  });
}
