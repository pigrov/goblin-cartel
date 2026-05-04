import { describe, expect, it } from "vitest";
import type { AdminCredentialRecord } from "../admin/credentials.js";
import { encryptCredential, type EncryptedCredential } from "../security/credentials.js";
import { PlayerIdentityVerifierNotConfiguredError } from "./player-save.js";
import { createVkIdentityVerifier } from "./vk-identity-verifier.js";

const masterKey = "local-test-master-key-32-characters";

class MemoryCredentialReader {
  readonly records = new Map<string, AdminCredentialRecord>();

  set(name: string, value: string): void {
    const now = new Date("2026-05-03T10:00:00.000Z");

    this.records.set(name, {
      id: `credential-${this.records.size + 1}`,
      name,
      type: "secret",
      environment: "production",
      encryptedValue: encryptCredential(value, masterKey),
      updatedBy: "admin-1",
      createdAt: now,
      updatedAt: now
    });
  }

  async findCredentialByName(name: string): Promise<AdminCredentialRecord | null> {
    return this.records.get(name) ?? null;
  }
}

function jsonResponse(body: unknown, init: { ok?: boolean; status?: number } = {}): Response {
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    json: async () => body
  } as Response;
}

describe("vk identity verifier", () => {
  it("verifies VK ID access token through VK users.get", async () => {
    const credentialStore = new MemoryCredentialReader();
    credentialStore.set("vk_id.client_id", "vk-client-id");
    const requests: string[] = [];
    const verifier = createVkIdentityVerifier({
      credentialStore,
      masterKey,
      fetchImpl: (async (url: RequestInfo | URL) => {
        requests.push(String(url));
        return jsonResponse({
          response: [
            {
              id: 123,
              first_name: "Крикк",
              last_name: "Медный",
              photo_200: "https://example.test/avatar.jpg"
            }
          ]
        });
      }) as typeof fetch
    });

    const result = await verifier.verifyVkIdentity({
      accessToken: "vk-access-token"
    });

    expect(requests[0]).toContain("https://api.vk.com/method/users.get");
    expect(requests[0]).toContain("access_token=vk-access-token");
    expect(result).toEqual({
      provider: "vk_id",
      providerUserId: "123",
      displayName: "Крикк Медный",
      avatarUrl: "https://example.test/avatar.jpg"
    });
  });

  it("exchanges authorization code before loading VK profile", async () => {
    const credentialStore = new MemoryCredentialReader();
    credentialStore.set("vk_id.client_id", "vk-client-id");
    credentialStore.set("vk_id.client_secret", "vk-client-secret");
    const requestBodies: string[] = [];
    const verifier = createVkIdentityVerifier({
      credentialStore,
      masterKey,
      fetchImpl: (async (url: RequestInfo | URL, init?: RequestInit) => {
        if (String(url).includes("oauth2/auth")) {
          requestBodies.push(String(init?.body));
          return jsonResponse({ access_token: "exchanged-token" });
        }

        return jsonResponse({
          response: [
            {
              id: "vk-user-1",
              screen_name: "krikk"
            }
          ]
        });
      }) as typeof fetch
    });

    const result = await verifier.verifyVkIdentity({
      authorizationCode: "auth-code",
      codeVerifier: "code-verifier",
      redirectUri: "vk123://vk.ru"
    });

    expect(requestBodies[0]).toContain("client_id=vk-client-id");
    expect(requestBodies[0]).toContain("client_secret=vk-client-secret");
    expect(requestBodies[0]).toContain("code=auth-code");
    expect(result).toMatchObject({
      providerUserId: "vk-user-1",
      displayName: "krikk"
    });
  });

  it("requires VK ID client id in encrypted app credentials", async () => {
    const verifier = createVkIdentityVerifier({
      credentialStore: new MemoryCredentialReader(),
      masterKey,
      fetchImpl: (async () => {
        throw new Error("fetch should not be called");
      }) as typeof fetch
    });

    await expect(verifier.verifyVkIdentity({ accessToken: "token" })).rejects.toBeInstanceOf(PlayerIdentityVerifierNotConfiguredError);
  });

  it("ignores malformed encrypted credential payloads", async () => {
    const credentialStore = new MemoryCredentialReader();
    const now = new Date("2026-05-03T10:00:00.000Z");
    credentialStore.records.set("vk_id.client_id", {
      id: "credential-1",
      name: "vk_id.client_id",
      type: "secret",
      environment: "production",
      encryptedValue: { broken: true } as unknown as EncryptedCredential,
      updatedBy: "admin-1",
      createdAt: now,
      updatedAt: now
    });
    const verifier = createVkIdentityVerifier({
      credentialStore,
      masterKey
    });

    await expect(verifier.verifyVkIdentity({ accessToken: "token" })).rejects.toBeInstanceOf(PlayerIdentityVerifierNotConfiguredError);
  });
});
