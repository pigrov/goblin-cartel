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
  | "mineTemplate"
  | "goblin"
  | "localization";

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
  validateVersion(actorAdminUserId: string, id: string): Promise<ContentValidationResponse | null>;
  publishVersion(actorAdminUserId: string, id: string): Promise<ContentPublishResponse | null>;
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

    async validateVersion(actorAdminUserId, id) {
      const detail = await getVersionDetail(options.store, id);

      if (!detail) {
        return null;
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

  return {
    resources: entities.filter((entity) => entity.entityType === "resource").map((entity) => entity.data),
    blockTypes: entities.filter((entity) => entity.entityType === "blockType").map((entity) => entity.data),
    veinTypes: entities.filter((entity) => entity.entityType === "veinType").map((entity) => entity.data),
    builtMineTypes: entities.filter((entity) => entity.entityType === "builtMineType").map((entity) => entity.data),
    mineTemplates: entities.filter((entity) => entity.entityType === "mineTemplate").map((entity) => entity.data),
    goblins: entities.filter((entity) => entity.entityType === "goblin").map((entity) => entity.data),
    localization
  } as ContentBundle;
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
