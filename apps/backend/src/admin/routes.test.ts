import { describe, expect, it } from "vitest";
import type { AdminAuthService } from "./auth.js";
import { registerAdminAuthRoutes } from "./routes.js";
import Fastify from "fastify";

const testUser = {
  id: "admin-1",
  email: "owner@example.com",
  role: "owner",
  mustSetPassword: true
};

describe("admin auth routes", () => {
  it("serves bootstrap status", async () => {
    const server = Fastify({ logger: false });
    await registerAdminAuthRoutes(server, createMockAuthService(), ["owner@example.com"]);

    const response = await server.inject({
      method: "GET",
      url: "/admin/bootstrap/status"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ bootstrapAdminEmailsConfigured: true });
  });

  it("returns token for bootstrap login", async () => {
    const server = Fastify({ logger: false });
    await registerAdminAuthRoutes(server, createMockAuthService(), ["owner@example.com"]);

    const response = await server.inject({
      method: "POST",
      url: "/admin/auth/bootstrap",
      payload: {
        email: "owner@example.com"
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      token: "session-token",
      user: testUser
    });
  });

  it("requires bearer token for password setup", async () => {
    const server = Fastify({ logger: false });
    await registerAdminAuthRoutes(server, createMockAuthService(), ["owner@example.com"]);

    const response = await server.inject({
      method: "POST",
      url: "/admin/auth/password",
      payload: {
        password: "strong-password-1"
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: "invalid_session" });
  });
});

function createMockAuthService(): AdminAuthService {
  return {
    async bootstrapLogin(email) {
      if (email !== "owner@example.com") {
        return { ok: false, code: "bootstrap_email_not_allowed" };
      }

      return {
        ok: true,
        value: {
          token: "session-token",
          user: testUser
        }
      };
    },
    async getSessionUser(token) {
      if (token !== "session-token") {
        return { ok: false, code: "invalid_session" };
      }

      return { ok: true, user: testUser };
    },
    async login() {
      return {
        ok: true,
        value: {
          token: "session-token",
          user: {
            ...testUser,
            mustSetPassword: false
          }
        }
      };
    },
    async logout() {
      return undefined;
    },
    async setPassword(token) {
      if (token !== "session-token") {
        return { ok: false, code: "invalid_session" };
      }

      return {
        ok: true,
        user: {
          ...testUser,
          mustSetPassword: false
        }
      };
    }
  };
}
