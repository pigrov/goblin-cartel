import { describe, expect, it } from "vitest";
import { loadEnv } from "./env.js";

describe("loadEnv", () => {
  it("loads required runtime settings", () => {
    const env = loadEnv({
      NODE_ENV: "test",
      PORT: "3001",
      BASE_URL: "https://goblin-cartel.murph.ru",
      DATABASE_URL: "postgres://example",
      APP_CREDENTIALS_MASTER_KEY: "local-test-master-key-32-characters",
      APP_BOOTSTRAP_ADMIN_EMAILS: "Admin@Example.com, second@example.com"
    });

    expect(env.port).toBe(3001);
    expect(env.assetStorageDir).toBe("storage/assets");
    expect(env.bootstrapAdminEmails).toEqual(["admin@example.com", "second@example.com"]);
  });
});
