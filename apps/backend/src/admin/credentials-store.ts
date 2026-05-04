import { asc, eq } from "drizzle-orm";
import type { createDb } from "../db/client.js";
import { appCredentials, auditLogs } from "../db/schema.js";
import type { AdminCredentialRecord, AdminCredentialStore } from "./credentials.js";

type AppDb = ReturnType<typeof createDb>;

export class DrizzleAdminCredentialStore implements AdminCredentialStore {
  constructor(private readonly db: AppDb) {}

  async findCredentialByName(name: string): Promise<AdminCredentialRecord | null> {
    const [record] = await this.db.select().from(appCredentials).where(eq(appCredentials.name, name)).limit(1);
    return record ?? null;
  }

  async listCredentials(): Promise<AdminCredentialRecord[]> {
    return this.db.select().from(appCredentials).orderBy(asc(appCredentials.name));
  }

  async upsertCredential(input: {
    name: string;
    type: string;
    environment: string;
    encryptedValue: AdminCredentialRecord["encryptedValue"];
    updatedBy: string;
  }): Promise<AdminCredentialRecord> {
    const updatedAt = new Date();
    const [record] = await this.db
      .insert(appCredentials)
      .values({
        name: input.name,
        type: input.type,
        environment: input.environment,
        encryptedValue: input.encryptedValue,
        updatedBy: input.updatedBy,
        updatedAt
      })
      .onConflictDoUpdate({
        target: appCredentials.name,
        set: {
          type: input.type,
          environment: input.environment,
          encryptedValue: input.encryptedValue,
          updatedBy: input.updatedBy,
          updatedAt
        }
      })
      .returning();

    if (!record) {
      throw new Error("Failed to upsert app credential");
    }

    return record;
  }

  async writeAuditLog(input: {
    actorAdminUserId: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await this.db.insert(auditLogs).values({
      actorAdminUserId: input.actorAdminUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata
    });
  }
}
