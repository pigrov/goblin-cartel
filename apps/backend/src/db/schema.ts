import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

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

export const players = pgTable("players", {
  id: uuid("id").defaultRandom().primaryKey(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow()
});

export const playerDevices = pgTable(
  "player_devices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    tokenHash: text("token_hash").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    playerIdx: index("player_devices_player_id_idx").on(table.playerId),
    tokenHashIdx: index("player_devices_token_hash_idx").on(table.tokenHash)
  })
);

export const playerIdentities = pgTable(
  "player_identities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    provider: text("provider", { enum: ["vk_id"] }).notNull(),
    providerUserId: text("provider_user_id").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    playerIdx: index("player_identities_player_id_idx").on(table.playerId),
    providerUserUnique: uniqueIndex("player_identities_provider_user_unique").on(table.provider, table.providerUserId)
  })
);

export const playerSaves = pgTable(
  "player_saves",
  {
    playerId: uuid("player_id")
      .references(() => players.id)
      .primaryKey(),
    schemaVersion: integer("schema_version").notNull().default(1),
    contentVersion: text("content_version").notNull(),
    revision: integer("revision").notNull().default(1),
    state: jsonb("state").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    contentVersionIdx: index("player_saves_content_version_idx").on(table.contentVersion)
  })
);

export const playerScores = pgTable(
  "player_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    playerId: uuid("player_id")
      .notNull()
      .references(() => players.id),
    scoreKey: text("score_key").notNull(),
    seasonId: text("season_id").notNull().default("global"),
    value: integer("value").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    playerIdx: index("player_scores_player_id_idx").on(table.playerId),
    leaderboardIdx: index("player_scores_leaderboard_idx").on(table.scoreKey, table.seasonId, table.value),
    playerScoreUnique: uniqueIndex("player_scores_player_key_season_unique").on(table.playerId, table.scoreKey, table.seasonId)
  })
);

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

export const playerDevicesRelations = relations(playerDevices, ({ one }) => ({
  player: one(players, {
    fields: [playerDevices.playerId],
    references: [players.id]
  })
}));

export const playerIdentitiesRelations = relations(playerIdentities, ({ one }) => ({
  player: one(players, {
    fields: [playerIdentities.playerId],
    references: [players.id]
  })
}));

export const playerSavesRelations = relations(playerSaves, ({ one }) => ({
  player: one(players, {
    fields: [playerSaves.playerId],
    references: [players.id]
  })
}));

export const playerScoresRelations = relations(playerScores, ({ one }) => ({
  player: one(players, {
    fields: [playerScores.playerId],
    references: [players.id]
  })
}));
