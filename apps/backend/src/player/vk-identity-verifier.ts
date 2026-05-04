import type { AdminCredentialRecord, AdminCredentialStore } from "../admin/credentials.js";
import { decryptCredential, type EncryptedCredential } from "../security/credentials.js";
import {
  PlayerIdentityVerifierNotConfiguredError,
  type PlayerIdentityVerifier,
  type VerifiedPlayerIdentity,
  type VkIdentityProof
} from "./player-save.js";

type FetchLike = typeof fetch;

const defaultVkApiVersion = "5.199";
const vkTokenUrl = "https://id.vk.ru/oauth2/auth";
const vkUsersGetUrl = "https://api.vk.com/method/users.get";

export interface VkIdentityVerifierOptions {
  credentialStore: Pick<AdminCredentialStore, "findCredentialByName">;
  fetchImpl?: FetchLike;
  masterKey: string;
}

interface VkIdentityVerifierConfig {
  apiVersion: string;
  clientId: string;
  clientSecret: string | null;
  redirectUri: string | null;
}

interface VkTokenResponse {
  access_token?: string;
  error?: string;
}

interface VkUserProfile {
  domain?: string;
  first_name?: string;
  id?: number | string;
  last_name?: string;
  photo_200?: string;
  screen_name?: string;
}

interface VkUsersGetResponse {
  error?: unknown;
  response?: VkUserProfile[];
}

export function createVkIdentityVerifier(options: VkIdentityVerifierOptions): PlayerIdentityVerifier {
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    async verifyVkIdentity(input) {
      const config = await readVkIdentityVerifierConfig(options);
      const accessToken = input.accessToken?.trim() || (await exchangeAuthorizationCode(fetchImpl, config, input));

      if (!accessToken) {
        return null;
      }

      return fetchVkUserIdentity(fetchImpl, config.apiVersion, accessToken);
    }
  };
}

async function readVkIdentityVerifierConfig(options: VkIdentityVerifierOptions): Promise<VkIdentityVerifierConfig> {
  const clientId = await readCredentialValue(options, "vk_id.client_id");

  if (!clientId) {
    throw new PlayerIdentityVerifierNotConfiguredError();
  }

  return {
    apiVersion: (await readCredentialValue(options, "vk_id.api_version")) ?? defaultVkApiVersion,
    clientId,
    clientSecret: await readCredentialValue(options, "vk_id.client_secret"),
    redirectUri: await readCredentialValue(options, "vk_id.redirect_uri")
  };
}

async function exchangeAuthorizationCode(
  fetchImpl: FetchLike,
  config: VkIdentityVerifierConfig,
  input: VkIdentityProof
): Promise<string | null> {
  const authorizationCode = input.authorizationCode?.trim();
  const codeVerifier = input.codeVerifier?.trim();
  const redirectUri = input.redirectUri?.trim() || config.redirectUri;

  if (!authorizationCode || !codeVerifier || !redirectUri) {
    return null;
  }

  if (!config.clientSecret) {
    throw new PlayerIdentityVerifierNotConfiguredError();
  }

  const response = await fetchImpl(vkTokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: authorizationCode,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as VkTokenResponse;
  return typeof payload.access_token === "string" ? payload.access_token.trim() || null : null;
}

async function fetchVkUserIdentity(
  fetchImpl: FetchLike,
  apiVersion: string,
  accessToken: string
): Promise<VerifiedPlayerIdentity | null> {
  const url = new URL(vkUsersGetUrl);
  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("fields", "id,screen_name,photo_200,first_name,last_name,domain");
  url.searchParams.set("v", apiVersion);

  const response = await fetchImpl(url, {
    headers: {
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as VkUsersGetResponse;
  const profile = payload.response?.[0];

  if (payload.error || !profile || profile.id === undefined || profile.id === null) {
    return null;
  }

  return {
    provider: "vk_id",
    providerUserId: String(profile.id),
    displayName: createVkDisplayName(profile),
    avatarUrl: normalizeVkString(profile.photo_200)
  };
}

async function readCredentialValue(options: VkIdentityVerifierOptions, name: string): Promise<string | null> {
  const record = await options.credentialStore.findCredentialByName(name);

  if (!record || !isEncryptedCredential(record.encryptedValue)) {
    return null;
  }

  const value = decryptCredential(record.encryptedValue, options.masterKey).trim();
  return value || null;
}

function createVkDisplayName(profile: VkUserProfile): string | null {
  const firstName = normalizeVkString(profile.first_name);
  const lastName = normalizeVkString(profile.last_name);
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  return fullName || normalizeVkString(profile.screen_name) || normalizeVkString(profile.domain);
}

function normalizeVkString(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function isEncryptedCredential(value: AdminCredentialRecord["encryptedValue"]): value is EncryptedCredential {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as EncryptedCredential;

  return (
    payload.algorithm === "aes-256-gcm" &&
    payload.keyVersion === "v1" &&
    typeof payload.iv === "string" &&
    typeof payload.tag === "string" &&
    typeof payload.ciphertext === "string"
  );
}
