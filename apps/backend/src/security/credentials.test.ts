import { describe, expect, it } from "vitest";
import { decryptCredential, encryptCredential } from "./credentials.js";

describe("credentials encryption", () => {
  it("roundtrips encrypted credentials without storing plaintext", () => {
    const masterKey = "local-test-master-key-32-characters";
    const encrypted = encryptCredential("secret-api-key", masterKey);

    expect(encrypted.ciphertext).not.toContain("secret-api-key");
    expect(decryptCredential(encrypted, masterKey)).toBe("secret-api-key");
  });
});
