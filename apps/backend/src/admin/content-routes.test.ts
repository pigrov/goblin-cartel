import { starterContentBundle } from "@goblin-cartel/content-schemas";
import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { AdminAuthService, PublicAdminUser } from "./auth.js";
import type { ContentService } from "./content.js";
import { registerContentRoutes } from "./content-routes.js";

const readyUser: PublicAdminUser = {
  id: "admin-1",
  email: "owner@example.com",
  role: "owner",
  mustSetPassword: false
};

describe("content routes", () => {
  it("returns 404 when no content is published", async () => {
    const server = Fastify({ logger: false });
    await registerContentRoutes(server, createAuthService(readyUser), createContentService(null));

    const response = await server.inject({
      method: "GET",
      url: "/content/current"
    });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: "no_published_content" });
  });

  it("requires auth for admin content versions", async () => {
    const server = Fastify({ logger: false });
    await registerContentRoutes(server, createAuthService(null), createContentService(null));

    const response = await server.inject({
      method: "GET",
      url: "/admin/content/versions"
    });

    expect(response.statusCode).toBe(401);
  });

  it("creates content version for ready admin", async () => {
    const server = Fastify({ logger: false });
    await registerContentRoutes(server, createAuthService(readyUser), createContentService("0.1.0"));

    const response = await server.inject({
      method: "POST",
      url: "/admin/content/versions",
      headers: {
        authorization: "Bearer token"
      },
      payload: {
        version: "0.1.0",
        notes: "first draft"
      }
    });

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      version: {
        version: "0.1.0",
        status: "draft"
      },
      content: {
        resources: expect.any(Array)
      }
    });
  });

  it("updates one content entity for ready admin", async () => {
    const server = Fastify({ logger: false });
    await registerContentRoutes(server, createAuthService(readyUser), createContentService("0.1.0"));
    const goblinGeneration = structuredClone(starterContentBundle.goblinGeneration);
    const firstArchetype = goblinGeneration.archetypes[0];

    if (firstArchetype) {
      firstArchetype.statRanges.strength.max = 12;
    }

    const response = await server.inject({
      method: "PUT",
      url: "/admin/content/versions/00000000-0000-4000-8000-000000000001/entities/goblinGeneration/default",
      headers: {
        authorization: "Bearer token"
      },
      payload: {
        entity: goblinGeneration,
        localization: {
          "goblin_generation.name": "Проверенная генерация"
        }
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      version: {
        version: "0.1.0",
        status: "draft"
      },
      content: {
        goblinGeneration: {
          archetypes: expect.any(Array)
        }
      }
    });
  });
});

function createAuthService(user: PublicAdminUser | null): AdminAuthService {
  return {
    async bootstrapLogin() {
      throw new Error("Not used");
    },
    async getSessionUser(token) {
      if (token !== "token" || !user) {
        return { ok: false, code: "invalid_session" };
      }

      return { ok: true, user };
    },
    async login() {
      throw new Error("Not used");
    },
    async logout() {
      return undefined;
    },
    async setPassword() {
      throw new Error("Not used");
    }
  };
}

function createContentService(version: string | null): ContentService {
  const publicVersion = {
    id: "00000000-0000-4000-8000-000000000001",
    version: version ?? "0.1.0",
    status: "draft",
    notes: "first draft",
    createdBy: "admin-1",
    createdAt: "2026-04-29T10:00:00.000Z",
    updatedAt: "2026-04-29T10:00:00.000Z",
    publishedAt: null
  };

  return {
    async createVersion() {
      return {
        version: publicVersion,
        content: starterContentBundle
      };
    },
    async getCurrentPublishedContent() {
      if (!version) {
        return null;
      }

      return {
        version: {
          ...publicVersion,
          status: "published",
          publishedAt: "2026-04-29T10:00:00.000Z"
        },
        content: starterContentBundle
      };
    },
    async getVersion() {
      return {
        version: publicVersion,
        content: starterContentBundle
      };
    },
    async listVersions() {
      return [publicVersion];
    },
    async publishVersion() {
      return {
        version: {
          ...publicVersion,
          status: "published"
        },
        content: starterContentBundle,
        validation: { ok: true, errors: [] }
      };
    },
    async replaceContent() {
      return {
        version: publicVersion,
        content: starterContentBundle
      };
    },
    async updateEntity() {
      return {
        version: publicVersion,
        content: starterContentBundle
      };
    },
    async validateVersion() {
      return {
        version: publicVersion,
        validation: { ok: true, errors: [] }
      };
    }
  };
}
