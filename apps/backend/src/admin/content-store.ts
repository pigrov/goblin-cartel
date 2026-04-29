import type { ContentBundle } from "@goblin-cartel/content-schemas";
import { and, desc, eq, ne } from "drizzle-orm";
import type { createDb } from "../db/client.js";
import { auditLogs, contentEntities, contentVersions } from "../db/schema.js";
import type { ContentStore, ContentVersionRecord, ContentVersionStatus } from "./content.js";

type AppDb = ReturnType<typeof createDb>;

export class DrizzleContentStore implements ContentStore {
  constructor(private readonly db: AppDb) {}

  async listVersions(): Promise<ContentVersionRecord[]> {
    return this.db.select().from(contentVersions).orderBy(desc(contentVersions.updatedAt));
  }

  async createVersion(input: { version: string; notes: string | null; createdBy: string }): Promise<ContentVersionRecord> {
    const [version] = await this.db
      .insert(contentVersions)
      .values({
        version: input.version,
        notes: input.notes,
        createdBy: input.createdBy,
        status: "draft"
      })
      .returning();

    if (!version) {
      throw new Error("Failed to create content version");
    }

    return version;
  }

  async findVersionById(id: string): Promise<ContentVersionRecord | null> {
    const [version] = await this.db.select().from(contentVersions).where(eq(contentVersions.id, id)).limit(1);
    return version ?? null;
  }

  async findPublishedVersion(): Promise<ContentVersionRecord | null> {
    const [version] = await this.db
      .select()
      .from(contentVersions)
      .where(eq(contentVersions.status, "published"))
      .orderBy(desc(contentVersions.publishedAt))
      .limit(1);

    return version ?? null;
  }

  async listEntities(contentVersionId: string) {
    return this.db
      .select()
      .from(contentEntities)
      .where(eq(contentEntities.contentVersionId, contentVersionId))
      .orderBy(contentEntities.entityType, contentEntities.entityId);
  }

  async replaceEntities(contentVersionId: string, content: ContentBundle): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.delete(contentEntities).where(eq(contentEntities.contentVersionId, contentVersionId));

      const rows = [
        ...content.resources.map((resource) => ({
          contentVersionId,
          entityType: "resource",
          entityId: resource.id,
          data: resource
        })),
        ...content.blockTypes.map((blockType) => ({
          contentVersionId,
          entityType: "blockType",
          entityId: blockType.id,
          data: blockType
        })),
        ...content.mineTemplates.map((mineTemplate) => ({
          contentVersionId,
          entityType: "mineTemplate",
          entityId: mineTemplate.id,
          data: mineTemplate
        })),
        ...content.goblins.map((goblin) => ({
          contentVersionId,
          entityType: "goblin",
          entityId: goblin.id,
          data: goblin
        })),
        ...Object.entries(content.localization).map(([locale, messages]) => ({
          contentVersionId,
          entityType: "localization",
          entityId: locale,
          data: messages
        }))
      ];

      if (rows.length > 0) {
        await tx.insert(contentEntities).values(rows);
      }
    });
  }

  async updateVersion(input: {
    id: string;
    status: ContentVersionStatus;
    notes?: string | null;
    publishedAt?: Date | null;
    updatedAt: Date;
  }): Promise<ContentVersionRecord> {
    const [version] = await this.db
      .update(contentVersions)
      .set({
        status: input.status,
        notes: input.notes,
        publishedAt: input.publishedAt,
        updatedAt: input.updatedAt
      })
      .where(eq(contentVersions.id, input.id))
      .returning();

    if (!version) {
      throw new Error("Failed to update content version");
    }

    return version;
  }

  async archivePublishedVersions(exceptVersionId: string, updatedAt: Date): Promise<void> {
    await this.db
      .update(contentVersions)
      .set({
        status: "archived",
        updatedAt
      })
      .where(and(eq(contentVersions.status, "published"), ne(contentVersions.id, exceptVersionId)));
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
