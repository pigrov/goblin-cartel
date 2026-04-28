import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./passwords.js";

describe("password hashing", () => {
  it("verifies matching passwords", async () => {
    const hash = await hashPassword("correct horse password");

    await expect(verifyPassword("correct horse password", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong horse password", hash)).resolves.toBe(false);
  });
});
