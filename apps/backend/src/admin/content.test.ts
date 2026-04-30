import { starterContentBundle, type ContentBundle } from "@goblin-cartel/content-schemas";
import { describe, expect, it } from "vitest";
import {
  createContentService,
  type ContentEntityRecord,
  type ContentStore,
  type ContentVersionRecord,
  type ContentVersionStatus
} from "./content.js";

class MemoryContentStore implements ContentStore {
  readonly versions = new Map<string, ContentVersionRecord>();
  readonly entities = new Map<string, ContentEntityRecord[]>();
  readonly auditLogs: Array<{ action: string; targetId: string | null; metadata?: Record<string, unknown> }> = [];
  private nextVersion = 1;
  private nextEntity = 1;

  async listVersions(): Promise<ContentVersionRecord[]> {
    return [...this.versions.values()].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
  }

  async createVersion(input: { version: string; notes: string | null; createdBy: string }): Promise<ContentVersionRecord> {
    const now = new Date("2026-04-29T10:00:00.000Z");
    const record: ContentVersionRecord = {
      id: `00000000-0000-4000-8000-${String(this.nextVersion).padStart(12, "0")}`,
      version: input.version,
      status: "draft",
      createdBy: input.createdBy,
      notes: input.notes,
      createdAt: now,
      updatedAt: now,
      publishedAt: null
    };
    this.nextVersion += 1;
    this.versions.set(record.id, record);
    return record;
  }

  async findVersionById(id: string): Promise<ContentVersionRecord | null> {
    return this.versions.get(id) ?? null;
  }

  async findPublishedVersion(): Promise<ContentVersionRecord | null> {
    return [...this.versions.values()].find((version) => version.status === "published") ?? null;
  }

  async listEntities(contentVersionId: string): Promise<ContentEntityRecord[]> {
    return this.entities.get(contentVersionId) ?? [];
  }

  async replaceEntities(contentVersionId: string, content: ContentBundle): Promise<void> {
    const rows = [
      ...content.resources.map((resource) => this.createEntity(contentVersionId, "resource", resource.id, resource)),
      ...content.blockTypes.map((blockType) => this.createEntity(contentVersionId, "blockType", blockType.id, blockType)),
      ...content.veinTypes.map((veinType) => this.createEntity(contentVersionId, "veinType", veinType.id, veinType)),
      ...content.builtMineTypes.map((builtMineType) =>
        this.createEntity(contentVersionId, "builtMineType", builtMineType.id, builtMineType)
      ),
      ...content.mineTemplates.map((mineTemplate) =>
        this.createEntity(contentVersionId, "mineTemplate", mineTemplate.id, mineTemplate)
      ),
      ...content.goblins.map((goblin) => this.createEntity(contentVersionId, "goblin", goblin.id, goblin)),
      ...Object.entries(content.localization).map(([locale, messages]) =>
        this.createEntity(contentVersionId, "localization", locale, messages)
      )
    ];
    this.entities.set(contentVersionId, rows);
  }

  async updateVersion(input: {
    id: string;
    status: ContentVersionStatus;
    notes?: string | null;
    publishedAt?: Date | null;
    updatedAt: Date;
  }): Promise<ContentVersionRecord> {
    const current = this.versions.get(input.id);

    if (!current) {
      throw new Error("Missing version");
    }

    const next = {
      ...current,
      status: input.status,
      notes: input.notes ?? current.notes,
      publishedAt: input.publishedAt === undefined ? current.publishedAt : input.publishedAt,
      updatedAt: input.updatedAt
    };
    this.versions.set(input.id, next);
    return next;
  }

  async archivePublishedVersions(exceptVersionId: string, updatedAt: Date): Promise<void> {
    for (const version of this.versions.values()) {
      if (version.status === "published" && version.id !== exceptVersionId) {
        this.versions.set(version.id, {
          ...version,
          status: "archived",
          updatedAt
        });
      }
    }
  }

  async writeAuditLog(input: {
    action: string;
    targetId: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    this.auditLogs.push(input);
  }

  private createEntity(contentVersionId: string, entityType: string, entityId: string, data: unknown): ContentEntityRecord {
    const now = new Date("2026-04-29T10:00:00.000Z");
    const record = {
      id: `entity-${this.nextEntity}`,
      contentVersionId,
      entityType,
      entityId,
      data,
      createdAt: now,
      updatedAt: now
    };
    this.nextEntity += 1;
    return record;
  }
}

describe("content service", () => {
  it("creates draft version with starter content", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({ store });

    const detail = await service.createVersion("admin-1", {
      version: "0.1.0",
      notes: "first balance"
    });

    expect(detail.version).toMatchObject({
      version: "0.1.0",
      status: "draft",
      notes: "first balance"
    });
    expect(detail.content.resources.map((resource) => resource.id)).toContain("gold");
    expect(detail.content.goblins.map((goblin) => goblin.id)).toContain("gryzz_crooked_tooth");
    expect(store.auditLogs.map((log) => log.action)).toContain("admin.content.version.create");
  });

  it("validates and publishes current content", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({
      store,
      now: () => new Date("2026-04-29T11:00:00.000Z")
    });
    const detail = await service.createVersion("admin-1", {
      version: "0.1.0"
    });

    const validation = await service.validateVersion("admin-1", detail.version.id);
    expect(validation?.validation).toEqual({ ok: true, errors: [] });

    const publish = await service.publishVersion("admin-1", detail.version.id);
    expect(publish?.version.status).toBe("published");

    const current = await service.getCurrentPublishedContent();
    expect(current?.version.version).toBe("0.1.0");
    expect(current?.content.mineTemplates[0]?.id).toBe("old_well_01");
  });

  it("rejects invalid content replacement", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({ store });
    const detail = await service.createVersion("admin-1", {
      version: "0.1.0"
    });

    const result = await service.replaceContent("admin-1", detail.version.id, {
      ...starterContentBundle,
      resources: []
    });

    expect(result).toMatchObject({
      error: "invalid_content"
    });
  });
});
