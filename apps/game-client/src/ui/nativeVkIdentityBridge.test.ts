import { describe, expect, it } from "vitest";
import { requestNativeVkIdentityProof } from "./nativeVkIdentityBridge";

describe("native VK ID bridge", () => {
  it("reads proof from Capacitor plugin", async () => {
    const result = await requestNativeVkIdentityProof({
      windowLike: {
        Capacitor: {
          Plugins: {
            GoblinCartelVkId: {
              requestVkIdentity: async () => ({
                accessToken: " vk-token "
              })
            }
          }
        }
      }
    });

    expect(result).toEqual({
      ok: true,
      proof: {
        accessToken: "vk-token",
        authorizationCode: undefined,
        codeVerifier: undefined,
        idToken: undefined,
        redirectUri: undefined
      }
    });
  });

  it("reads proof from direct WebView bridge JSON", async () => {
    const result = await requestNativeVkIdentityProof({
      windowLike: {
        GoblinCartelNative: {
          requestVkIdentity: () =>
            JSON.stringify({
              proof: {
                authorizationCode: "code",
                codeVerifier: "verifier",
                redirectUri: "vk123://vk.ru"
              }
            })
        }
      }
    });

    expect(result).toMatchObject({
      ok: true,
      proof: {
        authorizationCode: "code",
        codeVerifier: "verifier",
        redirectUri: "vk123://vk.ru"
      }
    });
  });

  it("reports cancelled native login", async () => {
    await expect(
      requestNativeVkIdentityProof({
        windowLike: {
          GoblinCartelNative: {
            requestVkIdentity: () => ({ status: "cancelled" })
          }
        }
      })
    ).resolves.toEqual({
      ok: false,
      code: "cancelled"
    });
  });

  it("reports missing native bridge", async () => {
    await expect(requestNativeVkIdentityProof({ windowLike: {} })).resolves.toEqual({
      ok: false,
      code: "bridge_unavailable"
    });
  });
});
