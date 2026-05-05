import {
  contentBundleSchema,
  starterContentBundle,
  validateContentBundle,
  type ContentBundle,
  type ContentValidationResult
} from "@goblin-cartel/content-schemas";

export type ContentVersionStatus = "draft" | "validated" | "published" | "archived";
export type ContentEntityType =
  | "resource"
  | "blockType"
  | "veinType"
  | "builtMineType"
  | "rewardChestType"
  | "bossCard"
  | "mineTemplate"
  | "goblinGeneration"
  | "goblinHut"
  | "elevator"
  | "localization";
export type EditableContentEntityType =
  | "blockType"
  | "bossCard"
  | "builtMineType"
  | "goblinGeneration"
  | "goblinHut"
  | "elevator"
  | "mineTemplate"
  | "rewardChestType";

export interface ContentVersionRecord {
  id: string;
  version: string;
  status: string;
  createdBy: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;
}

export interface ContentEntityRecord {
  id: string;
  contentVersionId: string;
  entityType: string;
  entityId: string;
  data: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicContentVersion {
  id: string;
  version: string;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface ContentVersionDetail {
  version: PublicContentVersion;
  content: ContentBundle;
}

export interface ContentStore {
  listVersions(): Promise<ContentVersionRecord[]>;
  createVersion(input: { version: string; notes: string | null; createdBy: string }): Promise<ContentVersionRecord>;
  findVersionById(id: string): Promise<ContentVersionRecord | null>;
  findPublishedVersion(): Promise<ContentVersionRecord | null>;
  listEntities(contentVersionId: string): Promise<ContentEntityRecord[]>;
  replaceEntities(contentVersionId: string, content: ContentBundle): Promise<void>;
  updateVersion(input: {
    id: string;
    status: ContentVersionStatus;
    notes?: string | null;
    publishedAt?: Date | null;
    updatedAt: Date;
  }): Promise<ContentVersionRecord>;
  archivePublishedVersions(exceptVersionId: string, updatedAt: Date): Promise<void>;
  writeAuditLog(input: {
    actorAdminUserId: string | null;
    action: string;
    targetType: string;
    targetId: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface ContentService {
  listVersions(actorAdminUserId: string): Promise<PublicContentVersion[]>;
  createVersion(
    actorAdminUserId: string,
    input: { version: string; notes?: string | null; content?: ContentBundle }
  ): Promise<ContentVersionDetail>;
  getVersion(actorAdminUserId: string, id: string): Promise<ContentVersionDetail | null>;
  replaceContent(actorAdminUserId: string, id: string, content: unknown): Promise<ContentVersionDetail | ContentError | null>;
  updateEntity(
    actorAdminUserId: string,
    id: string,
    input: {
      entityType: EditableContentEntityType;
      entityId: string;
      entity: unknown;
      localization?: Record<string, string>;
    }
  ): Promise<ContentVersionDetail | ContentError | null>;
  validateVersion(actorAdminUserId: string, id: string): Promise<ContentValidationResponse | ContentError | null>;
  publishVersion(actorAdminUserId: string, id: string): Promise<ContentPublishResponse | ContentError | null>;
  getCurrentPublishedContent(): Promise<ContentVersionDetail | null>;
}

export interface ContentValidationResponse {
  version: PublicContentVersion;
  validation: ContentValidationResult;
}

export interface ContentPublishResponse {
  version: PublicContentVersion;
  content: ContentBundle;
  validation: ContentValidationResult;
}

export interface ContentError {
  error: "invalid_content" | "version_not_editable";
  validation?: ContentValidationResult;
}

export function createContentService(options: { store: ContentStore; now?: () => Date }): ContentService {
  const now = options.now ?? (() => new Date());

  return {
    async listVersions(actorAdminUserId) {
      const versions = await options.store.listVersions();

      await options.store.writeAuditLog({
        actorAdminUserId,
        action: "admin.content.versions.list",
        targetType: "content_versions",
        targetId: null,
        metadata: { count: versions.length }
      });

      return versions.map(toPublicVersion);
    },

    async createVersion(actorAdminUserId, input) {
      const version = await options.store.createVersion({
        version: input.version,
        notes: input.notes ?? null,
        createdBy: actorAdminUserId
      });
      const content = input.content ?? starterContentBundle;
      await options.store.replaceEntities(version.id, content);

      await options.store.writeAuditLog({
        actorAdminUserId,
        action: "admin.content.version.create",
        targetType: "content_version",
        targetId: version.id,
        metadata: { version: version.version }
      });

      return {
        version: toPublicVersion(version),
        content
      };
    },

    async getVersion(actorAdminUserId, id) {
      const detail = await getVersionDetail(options.store, id);

      if (!detail) {
        return null;
      }

      await options.store.writeAuditLog({
        actorAdminUserId,
        action: "admin.content.version.read",
        targetType: "content_version",
        targetId: id
      });

      return detail;
    },

    async replaceContent(actorAdminUserId, id, contentInput) {
      const version = await options.store.findVersionById(id);

      if (!version) {
        return null;
      }

      if (version.status !== "draft" && version.status !== "validated") {
        return { error: "version_not_editable" };
      }

      const parsed = contentBundleSchema.safeParse(contentInput);

      if (!parsed.success) {
        return {
          error: "invalid_content",
          validation: {
            ok: false,
            errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "content"}: ${issue.message}`)
          }
        };
      }

      await options.store.replaceEntities(id, parsed.data);
      const updatedVersion = await options.store.updateVersion({
        id,
        status: "draft",
        updatedAt: now()
      });

      await options.store.writeAuditLog({
        actorAdminUserId,
        action: "admin.content.version.update",
        targetType: "content_version",
        targetId: id,
        metadata: { version: updatedVersion.version }
      });

      return {
        version: toPublicVersion(updatedVersion),
        content: parsed.data
      };
    },

    async updateEntity(actorAdminUserId, id, input) {
      const version = await options.store.findVersionById(id);

      if (!version) {
        return null;
      }

      if (version.status !== "draft" && version.status !== "validated") {
        return { error: "version_not_editable" };
      }

      const detail = await getVersionDetail(options.store, id);

      if (!detail) {
        return null;
      }

      const nextContent = upsertEditableContentEntity(detail.content, input);
      const parsed = contentBundleSchema.safeParse(nextContent);

      if (!parsed.success) {
        return {
          error: "invalid_content",
          validation: {
            ok: false,
            errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "content"}: ${issue.message}`)
          }
        };
      }

      const validation = validateContentBundle(parsed.data);

      if (!validation.ok) {
        return {
          error: "invalid_content",
          validation
        };
      }

      await options.store.replaceEntities(id, parsed.data);
      const updatedVersion = await options.store.updateVersion({
        id,
        status: "draft",
        updatedAt: now()
      });

      await options.store.writeAuditLog({
        actorAdminUserId,
        action: "admin.content.entity.update",
        targetType: "content_entity",
        targetId: `${input.entityType}:${input.entityId}`,
        metadata: {
          entityId: input.entityId,
          entityType: input.entityType,
          version: updatedVersion.version
        }
      });

      return {
        version: toPublicVersion(updatedVersion),
        content: parsed.data
      };
    },

    async validateVersion(actorAdminUserId, id) {
      const detail = await getVersionDetail(options.store, id);

      if (!detail) {
        return null;
      }

      if (!isEditableContentVersionStatus(detail.version.status)) {
        return { error: "version_not_editable" };
      }

      const validation = validateContentBundle(detail.content);
      const updatedVersion = validation.ok
        ? await options.store.updateVersion({
            id,
            status: "validated",
            updatedAt: now()
          })
        : await options.store.findVersionById(id);

      await options.store.writeAuditLog({
        actorAdminUserId,
        action: "admin.content.version.validate",
        targetType: "content_version",
        targetId: id,
        metadata: {
          ok: validation.ok,
          errorCount: validation.errors.length
        }
      });

      return {
        version: toPublicVersion(updatedVersion ?? detailToRecord(detail)),
        validation
      };
    },

    async publishVersion(actorAdminUserId, id) {
      const detail = await getVersionDetail(options.store, id);

      if (!detail) {
        return null;
      }

      if (!isEditableContentVersionStatus(detail.version.status)) {
        return { error: "version_not_editable" };
      }

      const validation = validateContentBundle(detail.content);

      if (!validation.ok) {
        return {
          version: detail.version,
          content: detail.content,
          validation
        };
      }

      const publishedAt = now();
      await options.store.archivePublishedVersions(id, publishedAt);
      const publishedVersion = await options.store.updateVersion({
        id,
        status: "published",
        publishedAt,
        updatedAt: publishedAt
      });

      await options.store.writeAuditLog({
        actorAdminUserId,
        action: "admin.content.version.publish",
        targetType: "content_version",
        targetId: id,
        metadata: { version: publishedVersion.version }
      });

      return {
        version: toPublicVersion(publishedVersion),
        content: detail.content,
        validation
      };
    },

    async getCurrentPublishedContent() {
      const published = await options.store.findPublishedVersion();

      if (!published) {
        return null;
      }

      const content = bundleFromEntities(await options.store.listEntities(published.id));

      return {
        version: toPublicVersion(published),
        content
      };
    }
  };
}

function isEditableContentVersionStatus(status: string): boolean {
  return status === "draft" || status === "validated";
}

function toPublicVersion(record: ContentVersionRecord): PublicContentVersion {
  return {
    id: record.id,
    version: record.version,
    status: record.status,
    notes: record.notes,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    publishedAt: record.publishedAt?.toISOString() ?? null
  };
}

async function getVersionDetail(store: ContentStore, id: string): Promise<ContentVersionDetail | null> {
  const version = await store.findVersionById(id);

  if (!version) {
    return null;
  }

  return {
    version: toPublicVersion(version),
    content: bundleFromEntities(await store.listEntities(id))
  };
}

function bundleFromEntities(entities: ContentEntityRecord[]): ContentBundle {
  const localization = Object.fromEntries(
    entities
      .filter((entity) => entity.entityType === "localization")
      .map((entity) => [entity.entityId, entity.data])
  );
  const goblinHutEntity = entities.find((entity) => entity.entityType === "goblinHut" && entity.entityId === "default");
  const goblinHut = goblinHutEntity?.data as ContentBundle["goblinHut"];
  const goblinGenerationEntity = entities.find((entity) => entity.entityType === "goblinGeneration" && entity.entityId === "default");
  const goblinGeneration = goblinGenerationEntity?.data as ContentBundle["goblinGeneration"] | undefined;
  const elevatorEntity = entities.find((entity) => entity.entityType === "elevator" && entity.entityId === "default");
  const elevator = elevatorEntity?.data as ContentBundle["elevator"] | undefined;

  return {
    resources: sortContentItems(entities, "resource", starterContentBundle.resources),
    blockTypes: sortContentItems(entities, "blockType", starterContentBundle.blockTypes),
    veinTypes: sortContentItems(entities, "veinType", starterContentBundle.veinTypes),
    builtMineTypes: sortContentItems(entities, "builtMineType", starterContentBundle.builtMineTypes),
    rewardChestTypes: sortContentItems(entities, "rewardChestType", starterContentBundle.rewardChestTypes),
    bossCards: sortContentItems(entities, "bossCard", starterContentBundle.bossCards),
    mineTemplates: sortContentItems(entities, "mineTemplate", starterContentBundle.mineTemplates),
    ...(goblinGeneration ? { goblinGeneration } : {}),
    ...(goblinHut ? { goblinHut } : {}),
    ...(elevator ? { elevator } : {}),
    localization
  } as unknown as ContentBundle;
}

function upsertEditableContentEntity(
  content: ContentBundle,
  input: {
    entityType: EditableContentEntityType;
    entityId: string;
    entity: unknown;
    localization?: Record<string, string>;
  }
): ContentBundle {
  const entity = isRecord(input.entity) ? input.entity : {};
  const normalizedEntity = {
    ...entity,
    id: input.entityId
  };
  const nextLocalization = input.localization
    ? {
        ...content.localization,
        ru: {
          ...(content.localization.ru ?? {}),
          ...input.localization
        }
      }
    : content.localization;

  if (input.entityType === "goblinHut") {
    return {
      ...content,
      goblinHut: normalizedEntity as ContentBundle["goblinHut"],
      localization: nextLocalization
    };
  }

  if (input.entityType === "goblinGeneration") {
    return {
      ...content,
      goblinGeneration: normalizedEntity as ContentBundle["goblinGeneration"],
      localization: nextLocalization
    };
  }

  if (input.entityType === "elevator") {
    return {
      ...content,
      elevator: normalizedEntity as ContentBundle["elevator"],
      localization: nextLocalization
    };
  }

  return {
    ...content,
    localization: nextLocalization,
    [collectionNameForEntityType(input.entityType)]: upsertById(
      collectionForEntityType(content, input.entityType),
      input.entityId,
      normalizedEntity
    )
  };
}

function collectionForEntityType(content: ContentBundle, entityType: EditableContentEntityType): Array<Record<string, unknown>> {
  switch (entityType) {
    case "blockType":
      return content.blockTypes;
    case "builtMineType":
      return content.builtMineTypes;
    case "bossCard":
      return content.bossCards;
    case "mineTemplate":
      return content.mineTemplates;
    case "rewardChestType":
      return content.rewardChestTypes;
    case "elevator":
    case "goblinHut":
    case "goblinGeneration":
      return [];
  }
}

function collectionNameForEntityType(
  entityType: Exclude<EditableContentEntityType, "elevator" | "goblinGeneration" | "goblinHut">
): "blockTypes" | "bossCards" | "builtMineTypes" | "mineTemplates" | "rewardChestTypes" {
  switch (entityType) {
    case "blockType":
      return "blockTypes";
    case "bossCard":
      return "bossCards";
    case "builtMineType":
      return "builtMineTypes";
    case "mineTemplate":
      return "mineTemplates";
    case "rewardChestType":
      return "rewardChestTypes";
  }
}

function upsertById(
  items: Array<Record<string, unknown>>,
  id: string,
  nextEntity: Record<string, unknown>
): Array<Record<string, unknown>> {
  const existingIndex = items.findIndex((item) => item.id === id);

  if (existingIndex === -1) {
    return [...items, nextEntity];
  }

  return items.map((item, index) => (index === existingIndex ? nextEntity : item));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortContentItems<T extends { id: string; sortOrder?: number }>(
  entities: ContentEntityRecord[],
  entityType: string,
  starterItems: readonly T[]
): T[] {
  const starterOrder = new Map(starterItems.map((item, index) => [item.id, index]));

  return entities
    .filter((entity) => entity.entityType === entityType)
    .map((entity) => entity.data as T)
    .sort((left, right) => {
      const leftSortOrder = typeof left.sortOrder === "number" ? left.sortOrder : Number.POSITIVE_INFINITY;
      const rightSortOrder = typeof right.sortOrder === "number" ? right.sortOrder : Number.POSITIVE_INFINITY;

      if (leftSortOrder !== rightSortOrder) {
        return leftSortOrder - rightSortOrder;
      }

      const leftStarterOrder = starterOrder.get(left.id) ?? Number.POSITIVE_INFINITY;
      const rightStarterOrder = starterOrder.get(right.id) ?? Number.POSITIVE_INFINITY;

      if (leftStarterOrder !== rightStarterOrder) {
        return leftStarterOrder - rightStarterOrder;
      }

      return left.id.localeCompare(right.id);
    });
}

function detailToRecord(detail: ContentVersionDetail): ContentVersionRecord {
  return {
    id: detail.version.id,
    version: detail.version.version,
    status: detail.version.status,
    notes: detail.version.notes,
    createdBy: detail.version.createdBy,
    createdAt: new Date(detail.version.createdAt),
    updatedAt: new Date(detail.version.updatedAt),
    publishedAt: detail.version.publishedAt ? new Date(detail.version.publishedAt) : null
  };
}
