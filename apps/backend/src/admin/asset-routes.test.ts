import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import Fastify from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import type { AdminAuthService, PublicAdminUser } from "./auth.js";
import { registerAssetRoutes } from "./asset-routes.js";

const readyUser: PublicAdminUser = {
  id: "admin-1",
  email: "owner@example.com",
  role: "owner",
  mustSetPassword: false
};

const onePixelPngBase64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

let storageDirs: string[] = [];

afterEach(async () => {
  await Promise.all(storageDirs.map((dir) => rm(dir, { force: true, recursive: true })));
  storageDirs = [];
});

describe("asset routes", () => {
  it("requires ready admin for goblin render upload", async () => {
    const server = Fastify({ logger: false });
    await registerAssetRoutes(server, createAuthService(null), { assetStorageDir: await createStorageDir() });

    const response = await server.inject({
      method: "POST",
      url: "/admin/assets/goblin-renders",
      payload: {
        assetId: "goblin_test",
        dataBase64: onePixelPngBase64,
        mimeType: "image/png"
      }
    });

    expect(response.statusCode).toBe(401);
  });

  it("stores goblin render and serves it as a public asset", async () => {
    const server = Fastify({ logger: false });
    await registerAssetRoutes(server, createAuthService(readyUser), { assetStorageDir: await createStorageDir() });

    const uploadResponse = await server.inject({
      method: "POST",
      url: "/admin/assets/goblin-renders",
      headers: {
        authorization: "Bearer token"
      },
      payload: {
        assetId: "goblin_test_render",
        dataBase64: onePixelPngBase64,
        fileName: "goblin_test_render.png",
        mimeType: "image/png"
      }
    });

    expect(uploadResponse.statusCode).toBe(200);
    expect(uploadResponse.json()).toMatchObject({
      asset: {
        assetId: "goblin_test_render",
        fileName: "goblin_test_render.png",
        mimeType: "image/png",
        url: "/api/assets/goblin_test_render"
      }
    });

    const assetResponse = await server.inject({
      method: "GET",
      url: "/assets/goblin_test_render"
    });

    expect(assetResponse.statusCode).toBe(200);
    expect(assetResponse.headers["content-type"]).toContain("image/png");
    expect(assetResponse.rawPayload.length).toBeGreaterThan(0);
  });

  it("accepts large base64 render payloads below the 5 MB file limit", async () => {
    const server = Fastify({ bodyLimit: 10 * 1024 * 1024, logger: false });
    await registerAssetRoutes(server, createAuthService(readyUser), { assetStorageDir: await createStorageDir() });
    const renderBytes = 2_402_489;

    const uploadResponse = await server.inject({
      method: "POST",
      url: "/admin/assets/goblin-renders",
      headers: {
        authorization: "Bearer token"
      },
      payload: {
        assetId: "goblin_large_render",
        dataBase64: Buffer.alloc(renderBytes, 1).toString("base64"),
        fileName: "goblin_large_render.png",
        mimeType: "image/png"
      }
    });

    expect(uploadResponse.statusCode).toBe(200);
    expect(uploadResponse.json()).toMatchObject({
      asset: {
        assetId: "goblin_large_render",
        size: renderBytes
      }
    });
  });
});

async function createStorageDir(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "goblin-cartel-assets-"));
  storageDirs.push(dir);
  return dir;
}

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
