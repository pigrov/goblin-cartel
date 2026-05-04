import { describe, expect, it } from "vitest";
import { decryptCredential, type EncryptedCredential } from "../security/credentials.js";
import {
  createAdminCredentialService,
  type AdminCredentialRecord,
  type AdminCredentialStore
} from "./credentials.js";

class MemoryCredentialStore implements AdminCredentialStore {
  readonly records = new Map<string, AdminCredentialRecord>();
  readonly auditLogs: Array<{ action: string; metadata?: Record<string, unknown> }> = [];

  async findCredentialByName(name: string): Promise<AdminCredentialRecord | null> {
    return this.records.get(name) ?? null;
  }

  async listCredentials(): Promise<AdminCredentialRecord[]> {
    return [...this.records.values()].sort((left, right) => left.name.localeCompare(right.name));
  }

  async upsertCredential(input: {
    name: string;
    type: string;
    environment: string;
    encryptedValue: EncryptedCredential;
    updatedBy: string;
  }): Promise<AdminCredentialRecord> {
    const existing = this.records.get(input.name);
    const now = new Date("2026-04-28T20:30:00.000Z");
    const record: AdminCredentialRecord = {
      id: existing?.id ?? `credential-${this.records.size + 1}`,
      name: input.name,
      type: input.type,
      environment: input.environment,
      encryptedValue: input.encryptedValue,
      updatedBy: input.updatedBy,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };

    this.records.set(input.name, record);
    return record;
  }

  async writeAuditLog(input: {
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.auditLogs.push(input);
  }
}

describe("admin credentials", () => {
  it("stores encrypted credential value and returns only metadata", async () => {
    const masterKey = "local-test-master-key-32-characters";
    const store = new MemoryCredentialStore();
    const service = createAdminCredentialService({ store, masterKey });

    const saved = await service.upsertCredential("admin-1", {
      name: "rustore.api_key",
      type: "api_key",
      environment: "production",
      value: "plain-secret-value"
    });

    expect(saved).toMatchObject({
      name: "rustore.api_key",
      type: "api_key",
      environment: "production",
      hasValue: true,
      updatedBy: "admin-1"
    });
    expect(JSON.stringify(saved)).not.toContain("plain-secret-value");

    const stored = store.records.get("rustore.api_key");
    expect(stored).toBeDefined();
    expect(JSON.stringify(stored?.encryptedValue)).not.toContain("plain-secret-value");
    expect(decryptCredential(stored?.encryptedValue as EncryptedCredential, masterKey)).toBe("plain-secret-value");
    expect(store.auditLogs.map((log) => log.action)).toEqual(["admin.credentials.upsert"]);
  });

  it("audits credential list reads", async () => {
    const store = new MemoryCredentialStore();
    const service = createAdminCredentialService({
      store,
      masterKey: "local-test-master-key-32-characters"
    });

    await service.listCredentials("admin-1");

    expect(store.auditLogs).toEqual([
      {
        actorAdminUserId: "admin-1",
        action: "admin.credentials.list",
        targetType: "app_credentials",
        targetId: null,
        metadata: { count: 0 }
      }
    ]);
  });
});
