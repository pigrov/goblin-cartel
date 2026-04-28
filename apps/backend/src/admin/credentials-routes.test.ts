import Fastify from "fastify";
import { describe, expect, it } from "vitest";
import type { AdminAuthService, PublicAdminUser } from "./auth.js";
import type { AdminCredentialService } from "./credentials.js";
import { registerAdminCredentialRoutes } from "./credentials-routes.js";

const readyUser: PublicAdminUser = {
  id: "admin-1",
  email: "owner@example.com",
  role: "owner",
  mustSetPassword: false
};

const setupUser: PublicAdminUser = {
  ...readyUser,
  mustSetPassword: true
};

describe("admin credential routes", () => {
  it("requires an authenticated admin", async () => {
    const server = Fastify({ logger: false });
    await registerAdminCredentialRoutes(server, createAuthService(null), createCredentialService());

    const response = await server.inject({
      method: "GET",
      url: "/admin/credentials"
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "invalid_session" });
  });

  it("blocks admins that still need to set password", async () => {
    const server = Fastify({ logger: false });
    await registerAdminCredentialRoutes(server, createAuthService(setupUser), createCredentialService());

    const response = await server.inject({
      method: "GET",
      url: "/admin/credentials",
      headers: {
        authorization: "Bearer token"
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({ error: "password_setup_required" });
  });

  it("lists credentials without values", async () => {
    const server = Fastify({ logger: false });
    await registerAdminCredentialRoutes(server, createAuthService(readyUser), createCredentialService());

    const response = await server.inject({
      method: "GET",
      url: "/admin/credentials",
      headers: {
        authorization: "Bearer token"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      credentials: [
        {
          id: "credential-1",
          name: "rustore.api_key",
          type: "api_key",
          environment: "production",
          hasValue: true,
          updatedBy: "admin-1",
          createdAt: "2026-04-28T20:30:00.000Z",
          updatedAt: "2026-04-28T20:30:00.000Z"
        }
      ]
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

function createCredentialService(): AdminCredentialService {
  return {
    async listCredentials() {
      return [
        {
          id: "credential-1",
          name: "rustore.api_key",
          type: "api_key",
          environment: "production",
          hasValue: true,
          updatedBy: "admin-1",
          createdAt: "2026-04-28T20:30:00.000Z",
          updatedAt: "2026-04-28T20:30:00.000Z"
        }
      ];
    },
    async upsertCredential() {
      throw new Error("Not used");
    }
  };
}
