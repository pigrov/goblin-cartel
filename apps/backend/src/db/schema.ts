import { relations } from "drizzle-orm";
import { boolean, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: text("role").notNull().default("admin"),
  mustSetPassword: boolean("must_set_password").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const appCredentials = pgTable("app_credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(),
  environment: text("environment").notNull().default("production"),
  encryptedValue: jsonb("encrypted_value").notNull(),
  updatedBy: uuid("updated_by").references(() => adminUsers.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const adminSessions = pgTable(
  "admin_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    adminUserId: uuid("admin_user_id")
      .notNull()
      .references(() => adminUsers.id),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true })
  },
  (table) => ({
    adminUserIdx: index("admin_sessions_admin_user_id_idx").on(table.adminUserId),
    tokenHashIdx: index("admin_sessions_token_hash_idx").on(table.tokenHash)
  })
);

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorAdminUserId: uuid("actor_admin_user_id").references(() => adminUsers.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: text("target_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const contentVersions = pgTable("content_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: text("version").notNull().unique(),
  status: text("status").notNull().default("draft"),
  createdBy: uuid("created_by").references(() => adminUsers.id),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  publishedAt: timestamp("published_at", { withTimezone: true })
});

export const contentEntities = pgTable("content_entities", {
  id: uuid("id").defaultRandom().primaryKey(),
  contentVersionId: uuid("content_version_id")
    .notNull()
    .references(() => contentVersions.id),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  data: jsonb("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  credentialsUpdated: many(appCredentials),
  auditLogs: many(auditLogs),
  contentVersions: many(contentVersions),
  sessions: many(adminSessions)
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  adminUser: one(adminUsers, {
    fields: [adminSessions.adminUserId],
    references: [adminUsers.id]
  })
}));

export const contentVersionsRelations = relations(contentVersions, ({ many }) => ({
  entities: many(contentEntities)
}));
