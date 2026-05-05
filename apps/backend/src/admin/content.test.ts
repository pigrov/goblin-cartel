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
      ...content.rewardChestTypes.map((rewardChestType) =>
        this.createEntity(contentVersionId, "rewardChestType", rewardChestType.id, rewardChestType)
      ),
      ...content.bossCards.map((bossCard) => this.createEntity(contentVersionId, "bossCard", bossCard.id, bossCard)),
      ...content.mineTemplates.map((mineTemplate) =>
        this.createEntity(contentVersionId, "mineTemplate", mineTemplate.id, mineTemplate)
      ),
      this.createEntity(contentVersionId, "goblinGeneration", "default", content.goblinGeneration),
      this.createEntity(contentVersionId, "goblinHut", "default", content.goblinHut),
      this.createEntity(contentVersionId, "elevator", "default", content.elevator),
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
    expect(detail.content.bossCards.map((card) => card.id)).toContain("hit_damage");
    expect(detail.content.goblinGeneration.archetypes.map((archetype) => archetype.id)).toContain("random_miner_contract");
    expect(detail.content.goblinHut.levels[0]?.maxHiredGoblins).toBe(2);
    expect(detail.content.elevator.levels[0]?.platformSlots).toBe(2);
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
    expect(validation && "validation" in validation ? validation.validation : null).toEqual({ ok: true, errors: [] });

    const publish = await service.publishVersion("admin-1", detail.version.id);
    expect(publish && "version" in publish ? publish.version.status : null).toBe("published");

    const current = await service.getCurrentPublishedContent();
    expect(current?.version.version).toBe("0.1.0");
    expect(current?.content.mineTemplates[0]?.id).toBe("old_well_01");
    expect(current?.content.goblinHut.id).toBe("default");
    expect(current?.content.elevator.id).toBe("default");
  });

  it("reads content entities without legacy boss card backfill", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({ store });
    const detail = await service.createVersion("admin-1", {
      version: "0.1.0"
    });
    store.entities.set(
      detail.version.id,
      (store.entities.get(detail.version.id) ?? []).filter((entity) => entity.entityType !== "bossCard")
    );

    const restored = await service.getVersion("admin-1", detail.version.id);

    expect(restored?.content.bossCards).toEqual([]);
  });

  it("keeps published and archived versions read-only", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({ store });
    const first = await service.createVersion("admin-1", {
      version: "0.1.0"
    });
    const second = await service.createVersion("admin-1", {
      version: "0.1.1"
    });

    expect(await service.publishVersion("admin-1", first.version.id)).toMatchObject({
      version: {
        status: "published"
      }
    });
    expect(await service.publishVersion("admin-1", second.version.id)).toMatchObject({
      version: {
        status: "published"
      }
    });

    expect(await service.validateVersion("admin-1", first.version.id)).toEqual({ error: "version_not_editable" });
    expect(await service.publishVersion("admin-1", first.version.id)).toEqual({ error: "version_not_editable" });
    expect(await service.validateVersion("admin-1", second.version.id)).toEqual({ error: "version_not_editable" });
    expect(await service.publishVersion("admin-1", second.version.id)).toEqual({ error: "version_not_editable" });
  });

  it("restores mine template order when reading content entities", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({ store });
    const detail = await service.createVersion("admin-1", {
      version: "0.1.0"
    });

    const reversedContent = {
      ...starterContentBundle,
      mineTemplates: [...starterContentBundle.mineTemplates].reverse().map((mineTemplate) => {
        const next = structuredClone(mineTemplate);
        Reflect.deleteProperty(next, "sortOrder");
        return next;
      })
    };

    await service.replaceContent("admin-1", detail.version.id, reversedContent);
    const current = await service.getVersion("admin-1", detail.version.id);

    expect(current?.content.mineTemplates.map((mineTemplate) => mineTemplate.id)).toEqual([
      "old_well_01",
      "abandoned_crosscut_02",
      "lower_gallery_03",
      "sunken_works_04",
      "red_iron_drop_05",
      "black_rib_06",
      "copper_stairs_07",
      "golden_draft_08",
      "iron_throat_09",
      "cartel_root_10"
    ]);
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

  it("updates goblin generation entity with server validation and audit log", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({
      store,
      now: () => new Date("2026-04-29T12:00:00.000Z")
    });
    const detail = await service.createVersion("admin-1", {
      version: "0.1.0"
    });
    const goblinGeneration = structuredClone(starterContentBundle.goblinGeneration);

    if (!goblinGeneration.archetypes[0]) {
      throw new Error("Missing starter goblin generation archetype");
    }

    goblinGeneration.archetypes[0].statRanges.strength.max = 14;

    const result = await service.updateEntity("admin-1", detail.version.id, {
      entityType: "goblinGeneration",
      entityId: "default",
      entity: goblinGeneration,
      localization: {
        [goblinGeneration.nameKey]: "Проверенная генерация"
      }
    });

    expect(result).toMatchObject({
      content: {
        localization: {
          ru: {
            [goblinGeneration.nameKey]: "Проверенная генерация"
          }
        }
      },
      version: {
        status: "draft",
        updatedAt: "2026-04-29T12:00:00.000Z"
      }
    });
    expect(result && "content" in result ? result.content.goblinGeneration.archetypes[0]?.statRanges.strength.max : null).toBe(14);
    expect(store.auditLogs.at(-1)).toMatchObject({
      action: "admin.content.entity.update",
      targetId: "goblinGeneration:default",
      metadata: {
        entityId: "default",
        entityType: "goblinGeneration",
        version: "0.1.0"
      }
    });
  });

  it("rejects single entity updates that break content references", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({ store });
    const detail = await service.createVersion("admin-1", {
      version: "0.1.0"
    });
    const builtMineType = structuredClone(starterContentBundle.builtMineTypes[0]);

    if (!builtMineType) {
      throw new Error("Missing starter built mine type");
    }

    const result = await service.updateEntity("admin-1", detail.version.id, {
      entityType: "builtMineType",
      entityId: builtMineType.id,
      entity: {
        ...builtMineType,
        productionResourceId: "missing_resource"
      },
      localization: {
        [builtMineType.nameKey]: "Сломанная шахта"
      }
    });

    expect(result).toMatchObject({
      error: "invalid_content",
      validation: {
        ok: false,
        errors: expect.arrayContaining([
          `builtMineTypes.${builtMineType.id} references missing production resource missing_resource`
        ])
      }
    });
  });

  it("updates goblin hut progression through the same server validation path", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({ store });
    const detail = await service.createVersion("admin-1", {
      version: "0.1.0"
    });
    const goblinHut = structuredClone(starterContentBundle.goblinHut);
    const firstLevel = goblinHut.levels[0];

    if (!firstLevel) {
      throw new Error("Missing starter hut level");
    }

    firstLevel.maxHiredGoblins = 3;

    const result = await service.updateEntity("admin-1", detail.version.id, {
      entityType: "goblinHut",
      entityId: "default",
      entity: goblinHut,
      localization: {
        [goblinHut.nameKey]: "Хижина проверки"
      }
    });

    expect(result && "content" in result ? result.content.goblinHut.levels[0]?.maxHiredGoblins : null).toBe(3);
    expect(result).toMatchObject({
      content: {
        localization: {
          ru: {
            [goblinHut.nameKey]: "Хижина проверки"
          }
        }
      }
    });
  });

  it("updates elevator progression through the same server validation path", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({ store });
    const detail = await service.createVersion("admin-1", {
      version: "0.1.0"
    });
    const elevator = structuredClone(starterContentBundle.elevator);
    const secondLevel = elevator.levels[1];

    if (!secondLevel) {
      throw new Error("Missing starter elevator level");
    }

    secondLevel.platformSlots = 4;

    const result = await service.updateEntity("admin-1", detail.version.id, {
      entityType: "elevator",
      entityId: "default",
      entity: elevator,
      localization: {
        [elevator.nameKey]: "Подъемник проверки"
      }
    });

    expect(result && "content" in result ? result.content.elevator.levels[1]?.platformSlots : null).toBe(4);
    expect(result).toMatchObject({
      content: {
        localization: {
          ru: {
            [elevator.nameKey]: "Подъемник проверки"
          }
        }
      }
    });
  });

  it("updates reward table entities through the same server validation path", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({ store });
    const detail = await service.createVersion("admin-1", {
      version: "0.1.0"
    });
    const rewardChestType = structuredClone(starterContentBundle.rewardChestTypes[0]);

    if (!rewardChestType) {
      throw new Error("Missing starter reward chest type");
    }

    const result = await service.updateEntity("admin-1", detail.version.id, {
      entityType: "rewardChestType",
      entityId: rewardChestType.id,
      entity: {
        ...rewardChestType,
        rewardTable: [{ resourceId: "gold", min: 10, max: 25, chance: 0.5 }]
      },
      localization: {
        [rewardChestType.nameKey]: "Проверочный сундук"
      }
    });

    expect(result && "content" in result ? result.content.rewardChestTypes[0]?.rewardTable : null).toEqual([
      { resourceId: "gold", min: 10, max: 25, chance: 0.5 }
    ]);
  });

  it("updates boss cards through the same server validation path", async () => {
    const store = new MemoryContentStore();
    const service = createContentService({ store });
    const detail = await service.createVersion("admin-1", {
      version: "0.1.0"
    });
    const bossCard = structuredClone(starterContentBundle.bossCards[0]);

    if (!bossCard) {
      throw new Error("Missing starter boss card");
    }

    const result = await service.updateEntity("admin-1", detail.version.id, {
      entityType: "bossCard",
      entityId: bossCard.id,
      entity: {
        ...bossCard,
        valuePerLevel: 5
      },
      localization: {
        [bossCard.nameKey]: "Проверочная карта"
      }
    });

    expect(result && "content" in result ? result.content.bossCards[0]?.valuePerLevel : null).toBe(5);
    expect(result).toMatchObject({
      content: {
        localization: {
          ru: {
            [bossCard.nameKey]: "Проверочная карта"
          }
        }
      }
    });
  });
});
