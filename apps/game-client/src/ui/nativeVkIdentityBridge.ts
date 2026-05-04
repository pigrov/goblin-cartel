import type { PlayerVkIdentityProof } from "./playerDbSaveClient";

export type NativeVkIdentityBridgeResult =
  | {
      ok: true;
      proof: PlayerVkIdentityProof;
    }
  | {
      ok: false;
      code: "bridge_unavailable" | "cancelled" | "invalid_response" | "native_error";
      message?: string;
    };

interface NativeVkIdentityWindow {
  Capacitor?: {
    Plugins?: {
      GoblinCartelVkId?: {
        requestVkIdentity?: () => Promise<unknown>;
      };
    };
  };
  GoblinCartelNative?: {
    requestVkIdentity?: () => Promise<unknown> | unknown;
  };
}

export async function requestNativeVkIdentityProof(input: {
  windowLike?: NativeVkIdentityWindow;
} = {}): Promise<NativeVkIdentityBridgeResult> {
  const windowLike: NativeVkIdentityWindow | undefined =
    input.windowLike ?? (typeof window === "undefined" ? undefined : (window as unknown as NativeVkIdentityWindow));

  if (!windowLike) {
    return { ok: false, code: "bridge_unavailable" };
  }

  const capacitorRequest = windowLike.Capacitor?.Plugins?.GoblinCartelVkId?.requestVkIdentity;
  const directRequest = windowLike.GoblinCartelNative?.requestVkIdentity;
  const request = capacitorRequest ?? directRequest;

  if (!request) {
    return { ok: false, code: "bridge_unavailable" };
  }

  try {
    return normalizeNativeVkIdentityResponse(await request());
  } catch (error) {
    return {
      ok: false,
      code: "native_error",
      message: error instanceof Error ? error.message : undefined
    };
  }
}

function normalizeNativeVkIdentityResponse(value: unknown): NativeVkIdentityBridgeResult {
  const payload = parseNativePayload(value);

  if (!payload || typeof payload !== "object") {
    return { ok: false, code: "invalid_response" };
  }

  const record = payload as Record<string, unknown>;

  if (record.status === "cancelled" || record.cancelled === true) {
    return { ok: false, code: "cancelled" };
  }

  const proofPayload = isRecord(record.proof) ? record.proof : record;
  const proof = normalizeProof(proofPayload);

  if (!proof) {
    return { ok: false, code: "invalid_response" };
  }

  return {
    ok: true,
    proof
  };
}

function parseNativePayload(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function normalizeProof(value: Record<string, unknown>): PlayerVkIdentityProof | null {
  const proof: PlayerVkIdentityProof = {
    accessToken: normalizeOptionalString(value.accessToken),
    authorizationCode: normalizeOptionalString(value.authorizationCode),
    codeVerifier: normalizeOptionalString(value.codeVerifier),
    idToken: normalizeOptionalString(value.idToken),
    redirectUri: normalizeOptionalString(value.redirectUri)
  };

  if (!proof.accessToken && !proof.authorizationCode && !proof.idToken) {
    return null;
  }

  return proof;
}

function normalizeOptionalString(value: unknown): string | undefined {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized || undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object");
}
