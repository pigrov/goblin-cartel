import { encryptCredential, type EncryptedCredential } from "../security/credentials.js";

export interface AdminCredentialRecord {
  id: string;
  name: string;
  type: string;
  environment: string;
  encryptedValue: unknown;
  updatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminCredentialListItem {
  id: string;
  name: string;
  type: string;
  environment: string;
  hasValue: true;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCredentialStore {
  findCredentialByName(name: string): Promise<AdminCredentialRecord | null>;
  listCredentials(): Promise<AdminCredentialRecord[]>;
  upsertCredential(input: {
    name: string;
    type: string;
    environment: string;
    encryptedValue: EncryptedCredential;
    updatedBy: string;
  }): Promise<AdminCredentialRecord>;
  writeAuditLog(input: {
    actorAdminUserId: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface AdminCredentialService {
  listCredentials(actorAdminUserId: string): Promise<AdminCredentialListItem[]>;
  upsertCredential(
    actorAdminUserId: string,
    input: {
      name: string;
      type: string;
      environment: string;
      value: string;
    }
  ): Promise<AdminCredentialListItem>;
}

export function createAdminCredentialService(options: {
  store: AdminCredentialStore;
  masterKey: string;
}): AdminCredentialService {
  return {
    async listCredentials(actorAdminUserId) {
      const records = await options.store.listCredentials();

      await options.store.writeAuditLog({
        actorAdminUserId,
        action: "admin.credentials.list",
        targetType: "app_credentials",
        targetId: null,
        metadata: { count: records.length }
      });

      return records.map(toListItem);
    },

    async upsertCredential(actorAdminUserId, input) {
      const encryptedValue = encryptCredential(input.value, options.masterKey);
      const record = await options.store.upsertCredential({
        name: input.name,
        type: input.type,
        environment: input.environment,
        encryptedValue,
        updatedBy: actorAdminUserId
      });

      await options.store.writeAuditLog({
        actorAdminUserId,
        action: "admin.credentials.upsert",
        targetType: "app_credentials",
        targetId: record.id,
        metadata: {
          name: record.name,
          type: record.type,
          environment: record.environment
        }
      });

      return toListItem(record);
    }
  };
}

function toListItem(record: AdminCredentialRecord): AdminCredentialListItem {
  return {
    id: record.id,
    name: record.name,
    type: record.type,
    environment: record.environment,
    hasValue: true,
    updatedBy: record.updatedBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}
