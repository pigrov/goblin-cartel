import { describe, expect, it } from "vitest";
import { buildServer } from "./server.js";

describe("server", () => {
  it("serves health status", async () => {
    const server = await buildServer({
      nodeEnv: "test",
      port: 3000,
      baseUrl: "https://goblin-cartel.murph.ru",
      databaseUrl: "postgres://example",
      credentialsMasterKey: "local-test-master-key-32-characters",
      bootstrapAdminEmails: ["admin@example.com"]
    });

    const response = await server.inject({
      method: "GET",
      url: "/health"
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: "ok",
      service: "goblin-cartel-backend"
    });
  });
});
