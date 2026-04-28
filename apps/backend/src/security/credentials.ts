import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export interface EncryptedCredential {
  algorithm: "aes-256-gcm";
  keyVersion: "v1";
  iv: string;
  tag: string;
  ciphertext: string;
}

export function encryptCredential(value: string, masterKey: string): EncryptedCredential {
  const key = deriveAes256Key(masterKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    algorithm: "aes-256-gcm",
    keyVersion: "v1",
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: ciphertext.toString("base64")
  };
}

export function decryptCredential(payload: EncryptedCredential, masterKey: string): string {
  if (payload.algorithm !== "aes-256-gcm") {
    throw new Error(`Unsupported credential algorithm: ${payload.algorithm}`);
  }

  const key = deriveAes256Key(masterKey);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final()
  ]).toString("utf8");
}

function deriveAes256Key(masterKey: string): Buffer {
  const trimmed = masterKey.trim();

  if (/^[a-f0-9]{64}$/i.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const base64 = Buffer.from(trimmed, "base64");
  if (base64.length === 32 && base64.toString("base64").replace(/=+$/u, "") === trimmed.replace(/=+$/u, "")) {
    return base64;
  }

  return createHash("sha256").update(trimmed, "utf8").digest();
}
